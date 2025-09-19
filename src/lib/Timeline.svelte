<script>
    import * as d3 from "d3";
    import { selectedYearsStore } from "../years";
    export let margin, height, width, russia_present, allYearMonthPairs;

    let xAxisGroup;
    let selectedLineStart = null,
        selectedLineEnd = null,
        selectedYearStart = null,
        selectedYearEnd = null;

    //create array with all years. some may be empty
    let svg;
    let selected_years = ["2018-1", "2024-12"];

    $: xScale = d3
        .scaleBand()
        .domain(allYearMonthPairs)
        .range([margin.left, width - margin.right])
        .padding(0.1);

    $: {
        if (xAxisGroup) {
            const domain = xScale.domain();
            let tickValues;

            if (width < 600) {
                // Mobile: ~5 ticks
                const step = Math.ceil(domain.length / 5);
                tickValues = domain.filter((_, i) => i % step === 0);
            } else if (width < 1200) {
                // Medium screens: ~10 ticks
                const step = Math.ceil(domain.length / 10);
                tickValues = domain.filter((_, i) => i % step === 0);
            } else {
                // Large screens: every 3rd tick
                tickValues = domain.filter((_, i) => i % 3 === 0);
            }

            const xAxis = d3
                .axisBottom(xScale)
                .tickValues(tickValues)
                .tickFormat((d) => {
                    const [year, month] = d.split("-");
                    return `${month}/${year}`;
                });

            d3.select(xAxisGroup)
                .call(xAxis)
                .selectAll("text")
                .style("fill", "white");

            d3.select(xAxisGroup).selectAll("line").style("stroke", "white");

            d3.select(xAxisGroup).select("path").style("stroke", "white");

            d3.select(xAxisGroup).call(xAxis);
        }
    }

    const yOffsets = {
        Syria: 50,
        Sudan: 70, // 50 + 20
        Israel: 90, // 70 + 20
        Afghanistan: 110,
        Yemen: 130,
        Libya: 150,
    };

    // brushing
    $: brush = d3
        .brushX()
        .handleSize(10)
        .extent([
            [margin.left, margin.top],
            [width - margin.right, height - margin.bottom],
        ])
        .on("start brush end", brushed);

    let snappedSelection = function (bandScale, domain) {
        console.log("domain", domain);

        // helper: turn "2018-1" → number 201801
        function ymToNumber(ym) {
            const [y, m] = ym.split("-").map(Number);
            return y * 100 + m;
        }

        // find min/max by numeric comparison
        const minValue = d3.min(domain, (d) => ymToNumber(d));
        const maxValue = d3.max(domain, (d) => ymToNumber(d));

        // recover the original strings
        const minStr = domain.find((d) => ymToNumber(d) === minValue);
        const maxStr = domain.find((d) => ymToNumber(d) === maxValue);

        console.log("min/max", minStr, maxStr);

        return [bandScale(minStr), bandScale(maxStr) + bandScale.bandwidth()];
    };
    let previousSelectedYears = { start: null, end: null };

    function brushed(event) {
        if (
            !event.selection &&
            !(event.sourceEvent && event.sourceEvent.offsetX)
        )
            return;

        let [x0, x1] = event.selection
            ? event.selection
            : [1, 2].fill(event.sourceEvent ? event.sourceEvent.offsetX : 0);

        // snapping for clicks
        if (event.sourceEvent && "offsetX" in event.sourceEvent) {
            if (Math.abs(x1 - x0) < xScale.bandwidth()) {
                let clickX = event.sourceEvent.offsetX;
                let closest = allYearMonthPairs.reduce((a, b) =>
                    Math.abs(xScale(b) - clickX) < Math.abs(xScale(a) - clickX)
                        ? b
                        : a,
                );
                x0 = xScale(closest);
                x1 = x0 + xScale.bandwidth();
            }
        }

        // filter year-months in selection
        let all_selected = allYearMonthPairs.filter((ym) => {
            let x = xScale(ym);
            return x >= x0 && x <= x1;
        });

        if (event.sourceEvent && event.type === "end") {
            let s1 = snappedSelection(xScale, all_selected);
            x0 = s1[0];
            x1 = s1[1];
            d3.select(this).transition().call(event.target.move, s1);
        }

        // update selection
        selectedLineStart = x0;
        selectedYearStart = all_selected[0];
        selectedLineEnd = x1;
        selectedYearEnd = all_selected[all_selected.length - 1];

        if (
            previousSelectedYears.start !== null &&
            previousSelectedYears.end !== null &&
            (selectedYearStart !== previousSelectedYears.start ||
                selectedYearEnd !== previousSelectedYears.end)
        ) {
            selected_years = [selectedYearStart, selectedYearEnd];
            selectedYearsStore.set(selected_years);
        }

        previousSelectedYears.start = selectedYearStart;
        previousSelectedYears.end = selectedYearEnd;
    }

    $: {
        // Update brush component
        if (svg) {
            d3.select(svg)
                .select(".brush")
                .call(brush)
                .call(brush.move, [margin.left, width - margin.right]);
        }
    }
</script>

<svg {height} {width} bind:this={svg}>
    <g
        bind:this={xAxisGroup}
        transform={`translate(0, ${height - margin.bottom})`}
    />

    {#each russia_present as r}
        <circle
            cx={xScale(`${r.Year}-${r.Month}`)}
            cy={yOffsets[r.conflict_country]}
            r="4"
            fill="white"
            opacity="0.5"
        >
        </circle>
    {/each}

    <g class="brush"> </g>
    <!-- Period lines and year labels -->
    {#if selectedLineStart && selectedLineEnd}
        <!-- Start line and label -->
        <line
            x1={selectedLineStart}
            y1={margin.top - 5}
            x2={selectedLineStart}
            y2={height - margin.bottom}
            stroke="black"
            stroke-width="2"
        />
        <!-- Start label background and text -->
        <g>
            <rect
                x={selectedLineStart - 15}
                y={margin.top - 19}
                width="30"
                height="15"
                fill="white"
                rx="3"
                ry="3"
            />
            <text
                x={selectedLineStart}
                y={margin.top - 7}
                text-anchor="middle"
                font-size="12px"
                font-weight="500"
                fill="black"
            >
                {selectedYearStart}
            </text>
        </g>

        <!-- End line -->
        <line
            x1={selectedLineEnd}
            y1={margin.top - 5}
            x2={selectedLineEnd}
            y2={height - margin.bottom}
            stroke="black"
            stroke-width="2"
        />

        {#if selectedYearStart !== selectedYearEnd}
            <!-- End label background and text -->
            <g>
                <rect
                    x={selectedLineEnd - 15}
                    y={margin.top - 19}
                    width="30"
                    height="15"
                    fill="white"
                    rx="3"
                    ry="3"
                />
                <text
                    x={selectedLineEnd}
                    y={margin.top - 7}
                    text-anchor="middle"
                    font-size="12px"
                    font-weight="500"
                    fill="black"
                >
                    {selectedYearEnd}
                </text>
            </g>
        {/if}
    {/if}
</svg>
