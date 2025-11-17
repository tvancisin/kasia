<script>
    import * as d3 from "d3";
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
    import { selectedYearsStore } from "../years";
    export let margin, width, russia_present, allYearMonthPairs, cntry;

    let brush;
    let brushGroup;

    export function clearBrush() {
        if (brush && brushGroup) {
            d3.select(brushGroup).call(brush.move, null); // clears rectangle
        }
    }

    let xAxisGroup;
    let yAxisGroup;
    let height = 200;
    let svg;
    let startDate = 0,
        endDate = 0;

    // initialize brush once
    $: if (brushGroup && !brush) {
        brush = d3
            .brushX()
            .extent([
                [margin.left, margin.top],
                [width - margin.right + 15, height - margin.bottom],
            ])
            .on("brush end", (event) => {
                if (event.selection) {
                    const [x0, x1] = event.selection;
                    startDate = xScale.invert(x0);
                    endDate = xScale.invert(x1);

                    selectedYearsStore.set({ startDate, endDate });
                }
            });

        d3.select(brushGroup).call(brush);
    }

    $: parsedData = russia_present.map((d) => {
        const year = +d.Year;
        const month = +d.Month - 1; // JS months are 0–11
        const day = +d.Day;

        return {
            ...d,
            date: new Date(year, month, day),
        };
    });

    $: dateExtent = d3.extent(parsedData, (d) => d.date);

    $: xScale = d3
        .scaleTime()
        .domain(dateExtent)
        .range([margin.left, width - margin.right]);

    $: countries = Array.from(
        new Set(russia_present.map((d) => d.conflict_country)),
    );

    $: yScale = d3
        .scaleBand()
        .domain(countries)
        .range([margin.top * 2, height - margin.bottom])
        .padding(0.2);

    $: isMobile = width < 600;
    const fullFormat = d3.timeFormat("%d/%m/%Y");
    const shortFormat = d3.timeFormat("%m/%Y");

    $: xAxis = d3
        .axisBottom(xScale)
        .ticks(isMobile ? 4 : 10)
        .tickFormat(isMobile ? shortFormat : fullFormat);

    $: yAxis = d3
        .axisLeft(yScale)
        .tickSize(-(width - margin.left - margin.right));

    // Draw + style X axis
    $: if (xAxisGroup) {
        const sel = d3.select(xAxisGroup).call(xAxis);
        sel.selectAll("path").style("stroke", "white").style("fill", "none");
        sel.selectAll("line").style("stroke", "white").style("opacity", 0.8);
        sel.selectAll("text")
            .style("fill", "white")
            .style("font-family", "'Montserrat', sans-serif")
            .style("font-size", "12px");
        sel.selectAll("text")
            .attr("text-anchor", "centre")
            .attr("dx", "-0.6em");
    }

    // Draw + style Y axis
    $: if (yAxisGroup) {
        const selY = d3.select(yAxisGroup).call(yAxis);
        selY.selectAll("path").style("stroke", "white").style("fill", "none");
        selY.selectAll("line").style("stroke", "white").style("opacity", 0.1);
        selY.selectAll("text")
            .style("fill", "white")
            .attr("dx", "-0.5em")
            .style("font-family", "'Montserrat', sans-serif")
            .style("font-size", "12px");
        selY.select(".domain").remove();
    }
</script>

<div class="timeline" bind:clientHeight={height}>
    <div class="timeline_legend">
        <span class="legend-circle"></span>
        - Mediation Event
    </div>
    <svg {height} {width} bind:this={svg}>
        <!-- X axis -->
        <g
            bind:this={xAxisGroup}
            transform={`translate(0, ${height - margin.bottom})`}
        />
        <!-- Y axis -->
        <g bind:this={yAxisGroup} transform={`translate(${margin.left}, 0)`} />
        <!-- draw circles -->
        {#each parsedData as r}
            <circle
                cx={xScale(r.date)}
                cy={yScale(r.conflict_country) + yScale.bandwidth() / 2}
                r="4"
                stroke={r.agmt === "1" ? "steelblue" : "none"}
                fill={r.conflict_country === cntry ? "yellow" : "white"}
                opacity="0.5"
            />
        {/each}
        <!-- brush -->
        <g bind:this={brushGroup} class="brush" />
    </svg>
</div>

<style>
    .timeline {
        width: 100%;
        height: 20vh;
    }
    .timeline_legend {
        color: gray;
        font-family: "Montserrat";
        font-size: 12px;
        position: absolute;
        bottom: 16vh;
        left: 80px;

        display: flex; /* align circle and text horizontally */
        align-items: center; /* vertically center */
        gap: 6px; /* space between circle and text */
    }

    .legend-circle {
        width: 8px;
        height: 8px;
        background-color: rgb(
            255,
            255,
            255
        ); /* or the same color you use for timeline circles */
        opacity: 0.5;
        border-radius: 50%; /* makes it a perfect circle */
        flex-shrink: 0; /* prevents shrinking */
    }

    :global(.selection) {
        fill: rgba(255, 255, 255, 0.203);
        stroke: none;
    }
</style>
