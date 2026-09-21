/**
 * Turns measured block positions into a list of cut points.
 *
 * The unit of splitting is a top-level block of the rendered article, so a cut
 * can never land inside a paragraph, list, code block, table or diagram.
 */

/**
 * Boundaries that would break a unit apart are dropped; the rest get a penalty
 * describing how natural a cut there looks.
 */
export function candidateCuts(blocks) {
    const cuts = [];

    for (let i = 0; i < blocks.length - 1; i += 1) {
        const before = blocks[i];
        const after = blocks[i + 1];
        if (before.isHeading) continue;      // a heading must stay with its body
        if (before.endsWithColon) continue;  // "…：" introduces the block below it
        if (after.isHr) continue;            // the rule closes the section above it

        let penalty = 9;                     // plain paragraph-to-paragraph seam
        if (before.isHr) penalty = 0;        // section break
        else if (after.tag === 'H2') penalty = 1;
        else if (after.tag === 'H3') penalty = 3;
        else if (after.tag === 'H4') penalty = 5;

        cuts.push({ afterIndex: i, penalty, y: (before.bottom + after.top) / 2 });
    }

    return cuts;
}

/**
 * Picks the set of cuts with the lowest total cost: pages close to the target
 * height, seams at natural places, nothing taller than `maxHeight`.
 */
export function planPages(blocks, { startY, endY, pageHeight, maxHeight, balance }) {
    const total = endY - startY;
    const pageCount = Math.max(1, Math.round(total / pageHeight));
    const target = total / pageCount;

    const nodes = [
        { y: startY, penalty: 0, afterIndex: -1 },
        ...candidateCuts(blocks),
        { y: endY, penalty: 0, afterIndex: blocks.length - 1 },
    ];

    const best = new Array(nodes.length).fill(Infinity);
    const from = new Array(nodes.length).fill(-1);
    best[0] = 0;

    for (let j = 1; j < nodes.length; j += 1) {
        for (let i = 0; i < j; i += 1) {
            if (!Number.isFinite(best[i])) continue;
            const height = nodes[j].y - nodes[i].y;
            if (height <= 0) continue;

            let cost = best[i] + nodes[j].penalty + balance * ((height - target) / target) ** 2;
            if (height > maxHeight) cost += 400 + (height - maxHeight) * 4;
            if (height < 420) cost += 400;

            if (cost < best[j]) {
                best[j] = cost;
                from[j] = i;
            }
        }
    }

    const chain = [];
    for (let j = nodes.length - 1; j > 0; j = from[j]) chain.push(nodes[j]);
    chain.reverse();

    return { target, cutIndices: chain.slice(0, -1).map((node) => node.afterIndex) };
}
