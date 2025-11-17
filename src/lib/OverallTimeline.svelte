<script>
    import * as d3 from "d3";
    export let filter_to_2324, russia_present, width, height, margin;

    $: eventsByMonth = (() => {
        // group events by Year-Month
        const map = d3.group(
            filter_to_2324,
            (d) => `${d.Year}-${String(d.Month).padStart(2, "0")}`,
        );

        // sort each month's events so those with CON_21 come first
        map.forEach((events) => {
            events.sort((a, b) => {
                const aHas = a.third_party_id?.includes("CON_21") ? 1 : 0;
                const bHas = b.third_party_id?.includes("CON_21") ? 1 : 0;
                return bHas - aHas; // descending → true ones first
            });
        });

        return map;
    })();
    // produce a sorted list of month keys
    $: monthKeys = Array.from(eventsByMonth.keys()).sort();

    $: xScale = d3
        .scaleBand()
        .domain(monthKeys)
        .range([50, width - 50])
        .padding(0.2);

    let svgEl;
    let xAxisG;

    $: if (xAxisG && xScale) {
        // pick up to 10 ticks evenly
        const tickValues = monthKeys.filter((_, i) => {
            const step = Math.ceil(monthKeys.length / 10);
            return i % step === 0;
        });

        const axis = d3
            .axisBottom(xScale)
            .tickValues(tickValues) // limit number of ticks
            .tickFormat((d) => d) // format as needed
            .tickSizeOuter(0);

        d3.select(xAxisG)
            .call(axis)
            .selectAll("text")
            .attr("fill", "gray")
            .attr("font-size", 10)
            .attr("text-anchor", "middle");
    }

    const circleRadius = 2;
    const circleSpacing = 3; // how much circles stack
</script>

<svg {width} {height} bind:this={svgEl}>
    <g transform={`translate(0, ${height - 40})`} bind:this={xAxisG}></g>

    {#each monthKeys as key}
        {#each eventsByMonth.get(key) as ev, i}
            <rect
                x={xScale(key)}
                y={height - 40 - i * circleSpacing}
                width={xScale.bandwidth()}
                height={2}
                fill={ev.third_party_id?.includes("CON_21") ? "black" : "white"}
                stroke="black"
            >
                <title>{ev.Summary}</title>
            </rect>
        {/each}
    {/each}
</svg>
