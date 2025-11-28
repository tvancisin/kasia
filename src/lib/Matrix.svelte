<script>
    import * as d3 from "d3";
    export let miserables, matrix_nodes, matrix_links;

    let orderType = "name",
        width,
        height,
        margin = { top: 80, right: 50, bottom: 10, left: 200 };

    // ----- Build matrix -----------------------------------------------------

    // let nodes = miserables.nodes;
    let nodes = matrix_nodes;
    let n = nodes.length;

    // let matrix = Array.from({ length: n }, (_, i) =>
    //     Array.from({ length: n }, (_, j) => ({ x: j, y: i, z: 0 })),
    // );

    // Matrix: n x n grid of {x, y, z}
    let matrix = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => ({ x: j, y: i, z: 0 })),
    );

    nodes.forEach((node, i) => {
        node.index = i;
        node.count = 0;
    });

    // Build a map from ID -> index
    const indexById = new Map();
    nodes.forEach((node, i) => {
        indexById.set(node.id, i);
    });

    // miserables.links.forEach((link) => {
    //     matrix[link.source][link.target].z += link.value;
    //     matrix[link.target][link.source].z += link.value;
    //     matrix[link.source][link.source].z += link.value;
    //     matrix[link.target][link.target].z += link.value;

    //     nodes[link.source].count += link.value;
    //     nodes[link.target].count += link.value;
    // });

    // Process links
    matrix_links.forEach((link) => {
        // Convert ID → numeric index
        const s = indexById.get(link.source);
        const t = indexById.get(link.target);

        if (s === undefined || t === undefined) {
            console.warn("Missing node for link:", link);
            return;
        }

        matrix[s][t].z += link.value;
        matrix[t][s].z += link.value;
        matrix[s][s].z += link.value;
        matrix[t][t].z += link.value;

        nodes[s].count += link.value;
        nodes[t].count += link.value;
    });

    // ----- Ordering ----------------------------------------------------------

    let orders = {
        name: d3
            .range(n)
            .sort((a, b) => d3.ascending(nodes[a].name, nodes[b].name)),
        count: d3.range(n).sort((a, b) => nodes[b].count - nodes[a].count),
        group: d3.range(n).sort((a, b) => nodes[b].group - nodes[a].group),
        groupThenCount: d3.range(n).sort((a, b) => {
            if (nodes[a].group !== nodes[b].group) {
                return nodes[b].group - nodes[a].group; // sort by group
            } else {
                return nodes[b].count - nodes[a].count; // within group, sort by count
            }
        }),
    };

    // ----- Dimensions ---------------------------------------------------------

    // Width inside the SVG is 70% of container width
    $: innerW = width * 0.7 - margin.left - margin.right;
    $: innerH = height - margin.top - margin.bottom;

    // Square matrix size (fits width or height)
    $: matrixSize = Math.min(innerW, innerH);

    // ----- Scales ------------------------------------------------------------

    $: x = d3.scaleBand().range([0, matrixSize]).paddingInner(0);

    // Reactively update scale domain when order changes
    $: x.domain(orders[orderType]);

    const z = d3.scaleLinear().domain([0, 4]).clamp(true);
    const c = d3.scaleOrdinal(d3.schemeCategory10);

    // Hover state
    let hoverX = null;
    let hoverY = null;
</script>

<div class="wrapper" bind:clientWidth={width} bind:clientHeight={height}>
    <label>
        Order:
        <select bind:value={orderType}>
            <option value="name">by Name</option>
            <option value="count">by Frequency</option>
            <option value="group">by Cluster</option>
            <option value="groupThenCount">by GK</option>
        </select>
    </label>

    <svg {width} {height}>
        <g transform={`translate(${margin.left},${margin.top})`}>
            <!-- Background -->
            <rect
                class="background"
                width={matrixSize}
                height={matrixSize}
                fill="#eee"
                rx="3"
                ry="3"
            />

            <!-- ROWS -->
            {#each orders[orderType] as rowIndex}
                <g class="row" transform={`translate(0,${x(rowIndex)})`}>
                    <line x2={matrixSize} />

                    <text
                        x={-6}
                        y={x.bandwidth() / 2}
                        dy=".32em"
                        font-size="9px"
                        fill="gray"
                        font-family="Montserrat"
                        text-anchor="end"
                        class:hover={rowIndex === hoverY}
                    >
                        {nodes[rowIndex].name}
                    </text>

                    {#each matrix[rowIndex].filter((d) => d.z > 0) as cell}
                        <rect
                            class="cell"
                            x={x(cell.x)}
                            width={x.bandwidth()}
                            height={x.bandwidth()}
                            fill-opacity={z(cell.z)}
                            fill={nodes[cell.x].group === nodes[cell.y].group
                                ? c(nodes[cell.x].group)
                                : null}
                            on:mouseenter={() => {
                                hoverX = cell.x;
                                hoverY = cell.y;
                            }}
                            on:mouseleave={() => {
                                hoverX = null;
                                hoverY = null;
                            }}
                        />
                    {/each}
                </g>
            {/each}

            <!-- COLUMNS -->
            {#each orders[orderType] as colIndex}
                <g
                    class="column"
                    transform={`translate(${x(colIndex)},0) rotate(-90)`}
                >
                    <line x1={-matrixSize} />
                    <text
                        x={6}
                        y={x.bandwidth() / 2}
                        font-size="9px"
                        fill="gray"
                        font-family="Montserrat"
                        dy=".32em"
                        class:hover={colIndex === hoverX}
                    >
                        {nodes[colIndex].name}
                    </text>
                </g>
            {/each}
        </g>
    </svg>
</div>

<style>
    .wrapper {
        width: 100%;
        height: 100vh;
        background: white;
    }

    label {
        position: absolute;
        top: 10px;
        left: 10px;
        font-family: "Montserrat", sans-serif;
        font-size: 14px;
        color: #333;
        z-index: 10;
    }

    text:hover,
    text.hover {
        fill: black;
        font-weight: bold;
    }

    line {
        stroke: #a5a5a5;
    }
</style>
