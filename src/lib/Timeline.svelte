<script>
    import * as d3 from "d3";
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
    import { selectedYearsStore } from "../years";
    export let margin, width, russia_present, allYearMonthPairs, cntry, medType;

    let brush;
    let brushGroup;

    export function clearBrush() {
        if (brush && brushGroup) {
            d3.select(brushGroup).call(brush.move, null);

            // Hide handle lines & labels
            const g = d3.select(svg).select(".brush-handles");
            g.selectAll("line").attr("stroke", "none");
            g.selectAll("text").text("");
        }
    }

    let xAxisGroup;
    let yAxisGroup;
    let height = 200;
    let svg;
    let startDate = 0,
        endDate = 0;

    function updateBrushHandles(x0, x1) {
        const g = d3.select(svg).select(".brush-handles");

        const yTop = margin.top;
        const yBottom = height - margin.bottom;

        // Start line
        g.select(".brush-start-line")
            .attr("x1", x0)
            .attr("x2", x0)
            .attr("y1", yTop)
            .attr("y2", yBottom)
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.9);

        // End line
        g.select(".brush-end-line")
            .attr("x1", x1)
            .attr("x2", x1)
            .attr("y1", yTop)
            .attr("y2", yBottom)
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.9);

        const labelFormat = d3.timeFormat("%d %b %Y");

        // Labels
        g.select(".brush-start-label")
            .attr("x", x0)
            .attr("y", yTop - 6)
            .text(labelFormat(startDate))
            .style("fill", "white")
            .style("font-size", "11px")
            .style("font-family", "'Montserrat', sans-serif")
            .style("text-anchor", "middle");

        g.select(".brush-end-label")
            .attr("x", x1)
            .attr("y", yTop - 6)
            .text(labelFormat(endDate))
            .style("fill", "white")
            .style("font-size", "11px")
            .style("font-family", "'Montserrat', sans-serif")
            .style("text-anchor", "middle");
    }

    // initialize brush once
    $: if (brushGroup && !brush) {
        brush = d3
            .brushX()
            .extent([
                [margin.left, margin.top],
                [width - margin.right, height - margin.bottom],
            ])
            .on("brush end", (event) => {
                if (event.selection) {
                    const [x0, x1] = event.selection;

                    startDate = xScale.invert(x0);
                    endDate = xScale.invert(x1);

                    selectedYearsStore.set({ startDate, endDate });

                    updateBrushHandles(x0, x1);
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

<div class="timeline" bind:clientWidth={width} bind:clientHeight={height}>
    <div class="timeline_legend">
        <div class="legend-item one">
            <span class="legend-circle" style="background-color: white;"></span>
            Mediation Event
        </div>
        <div class="legend-item">
            <span
                class="legend-circle"
                style="background-color: white; width: 15px; height: 15px"
            ></span>
            Agreement Signed
        </div>
    </div>
    <svg {height} {width} bind:this={svg}>
        <!-- brushed boundary lines + labels -->
        <g class="brush-handles">
            <line class="brush-start-line" />
            <text class="brush-start-label" />

            <line class="brush-end-line" />
            <text class="brush-end-label" />
        </g>
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
                r={r.agmt === "1" ? 8 : 4}
                fill={r.conflict_country === cntry ? "yellow" : "white"}
                opacity={r.conflict_country !== cntry
                    ? 0.5
                    : medType === "All" || r.med_type === medType
                      ? 0.5
                      : 0}
                class={r.conflict_country + " " + r.med_type}
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
        color: rgb(195, 195, 195);
        font-family: "Montserrat";
        font-size: 12px;
        position: absolute;
        bottom: 30.5vh;
        left: 20px;

        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .one {
        margin-left: 3px;
    }

    .legend-circle {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
        opacity: 0.5;
    }

    :global(.selection) {
        fill: rgba(255, 255, 255, 0.203);
        stroke: none;
    }
</style>
