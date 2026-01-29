<script>
  import * as d3 from "d3";
  export let filter_to_2324, width, height;

  $: console.log(height);
  // group & sort events per month (your existing logic)
  $: eventsByMonth = (() => {
    const map = d3.group(
      filter_to_2324,
      (d) => `${d.Year}-${String(d.Month).padStart(2, "0")}`,
    );

    map.forEach((events) => {
      events.sort((a, b) => {
        const aHas = a.third_party_id?.includes("CON_21") ? 1 : 0;
        const bHas = b.third_party_id?.includes("CON_21") ? 1 : 0;
        return bHas - aHas;
      });
    });

    return map;
  })();

  // sorted months
  $: monthKeys = Array.from(eventsByMonth.keys()).sort();

  // convert map → stacked-data-friendly array
  $: stackedData = monthKeys.map((month) => {
    const evs = eventsByMonth.get(month);
    return {
      month,
      con21: evs.filter((d) => d.third_party_id?.includes("CON_21")).length,
      other: evs.filter((d) => !d.third_party_id?.includes("CON_21")).length,
    };
  });

  // X scale (use band → but convert to point centers)
  $: xScale = d3
    .scaleBand()
    .domain(monthKeys)
    .range([60, width - 40])
    .padding(0.1);

  // Y scale (total events in a month)
  $: maxY = d3.max(stackedData, (d) => d.con21 + d.other);

  $: yScale = d3
    .scaleLinear()
    .domain([0, maxY])
    .range([height - 60, 20]); // bottom → top

  // build stacks
  $: stackGen = d3.stack().keys(["con21", "other"]); // con21 is now the bottom layer

  $: layers = stackGen(stackedData);

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
      .attr("fill", "white")
      .attr("font-size", 12)
      .attr("font-family", "'Montserrat', sans-serif")
      .attr("text-anchor", "middle");

    d3.select(xAxisG)
      .select("path.domain")
      .attr("stroke", "gray")
      .attr("stroke-width", 1);

    // style all tick lines
    d3.select(xAxisG)
      .selectAll("line")
      .attr("stroke", "gray")
      .attr("stroke-width", 1);
  }
</script>

<svg {width} {height} bind:this={svgEl}>
  <g transform={`translate(0,${height - 60})`} bind:this={xAxisG} />
  <!-- LEGEND -->
  <g transform="translate(20,20)">
    <!-- Overall (gray) -->
    <rect x="0" y="0" width="18" height="12" fill="#666666" rx="2" />
    <text x="24" y="10" fill="white" font-size="12" font-family="Montserrat">
      Overall
    </text>

    <!-- Russia (white) -->
    <rect x="0" y="22" width="18" height="12" fill="white" rx="2" />
    <text x="24" y="32" fill="white" font-size="12" font-family="Montserrat">
      Russia
    </text>
  </g>

  {#each layers as layer, i}
    <path
      fill={i === 0 ? "white" : "#666666"}
      opacity="1"
      stroke="none"
      d={d3
        .area()
        .x((d) => xScale(d.data.month) + xScale.bandwidth() / 2)
        .y0((d) => yScale(d[0]))
        .y1((d) => yScale(d[1]))
        .curve(d3.curveMonotoneX)(layer)}
    />
  {/each}

  <!-- AREA LABELS -->
  {#each monthKeys as m, idx}
    <!-- bottom layer (con21) -->
    {#if stackedData[idx].con21 > 0}
      <rect
        x={xScale(m) + xScale.bandwidth() / 2 - 10}
        y={yScale(layers[0][idx][1]) - 16}
        width="20"
        height="13"
        rx="2"
        fill="black"
        opacity="0.7"
      />
      <text
        x={xScale(m) + xScale.bandwidth() / 2}
        y={yScale(layers[0][idx][1]) - 5}
        text-anchor="middle"
        font-size="12"
        fill="white"
        font-family="Montserrat"
      >
        {stackedData[idx].con21}
      </text>
      <circle
        cx={xScale(m) + xScale.bandwidth() / 2}
        cy={yScale(layers[0][idx][1])}
        r="2"
        fill="black"
        stroke="white"
      ></circle>
    {/if}

    <!-- top layer (other) -->
    {#if stackedData[idx].other > 0}
      <rect
        x={xScale(m) + xScale.bandwidth() / 2 - 10}
        y={yScale(layers[1][idx][1]) - 16}
        width="20"
        height="13"
        rx="3"
        fill="black"
        opacity="0.7"
      />
      <text
        x={xScale(m) + xScale.bandwidth() / 2}
        y={yScale(layers[1][idx][1]) - 5}
        text-anchor="middle"
        font-size="12"
        fill="white"
        font-family="Montserrat"
      >
        {stackedData[idx].other}
      </text>
      <circle
        cx={xScale(m) + xScale.bandwidth() / 2}
        cy={yScale(layers[1][idx][1])}
        r="2"
        fill="black"
        stroke="white"
      ></circle>
    {/if}
  {/each}
</svg>
