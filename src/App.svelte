<script>
  import * as d3 from "d3";
  import { onMount, tick } from "svelte";
  import { getCSV, constructNodesAndLinks } from "./utils";
  import Timeline from "./lib/Timeline.svelte";

  // TODO
  // filter by number of connections

  let renderedLinks = [],
    // will populate this with DOM elements keyed by node ID
    nodeElements = {},
    // will hold the <circle> DOM elements
    circleRefs = [],
    simulation,
    nodes,
    links,
    maxValue,
    russia_conflicts,
    mend,
    actors,
    svgEl,
    gEl,
    width,
    height = 600,
    current_data,
    margin = { top: 20, right: 50, bottom: 20, left: 50 },
    years = [],
    allYearMonthPairs = [],
    cntry = "Israel",
    russia_present = [],
    opacityScale,
    widthScale,
    // text boxes size calculation
    textRefs = [],
    textBBoxes = [];

  // init
  onMount(async () => {
    // load the data
    [mend, actors] = await getCSV(["./mend.csv", "./actors.csv"]);
    let clean_mend = mend.filter((d) => d.med_event_ID != "");
    let russia = actors.find((d) => d.ActorName === "Russia")?.GLOPAD_ID;
    russia_present = clean_mend.filter((item) =>
      item.third_party_id_GLOPAD?.split(";").includes(russia),
    );

    russia_conflicts = d3.groups(russia_present, (d) => d.conflict_country);
    let selected = russia_conflicts[5][1];
    current_data = selected;

    // timeline
    years = [...new Set(clean_mend.map((d) => d.Year))]; // Extract unique years
    allYearMonthPairs = years.flatMap((year) =>
      Array.from({ length: 12 }, (_, i) => `${year}-${i + 1}`),
    );

    // trigger simulation
    setupSimulation(selected);
  });

  // simulation function
  async function setupSimulation(selected) {
    let strength;
    if (selected[1].conflict_country == "Yemen") {
      strength = -3999;
    } else if (selected[1].conflict_country == "Sudan") {
      strength = -1999;
    } else if (selected[1].conflict_country == "Afghanistan") {
      strength = -4999;
    } else {
      strength = -799;
    }

    // calculate nodes and links
    let { nodes: ns, links: ls } = constructNodesAndLinks(selected, actors);
    nodes = ns;
    links = ls;

    maxValue = Math.max(...links.map((l) => l.value));
    let strengthScale = d3
      .scaleLinear()
      .domain([1, maxValue])
      .range([0.1, 0.5]);

    let linkForce = d3
      .forceLink(links)
      .id((d) => d.id)
      .strength((link) => strengthScale(link.value));

    // create simulation once
    simulation = d3
      .forceSimulation(nodes)
      .force("link", linkForce)
      .force("charge", d3.forceManyBody().strength(strength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .on("tick", () => {
        nodes = [...nodes];
        nodes.forEach((d) => {
          d.x = Math.max(5, Math.min(width - 20, d.x));
          d.y = Math.max(20, Math.min(height - 100, d.y));
        });
        renderedLinks = linkForce.links();
      });

    await tick(); // wait for DOM update

    // rebuild nodeElements
    nodeElements = {};
    nodes.forEach((node, i) => {
      nodeElements[node.id] = circleRefs[i];
    });

    // dragging
    const drag = d3
      .drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    for (const node of nodes) {
      const el = nodeElements[node.id];
      if (el) {
        d3.select(el).datum(node).call(drag);
      }
    }
  }

  $: if (maxValue) {
    opacityScale = d3.scaleLinear().domain([1, maxValue]).range([0.1, 1]);
    widthScale = d3.scaleLinear().domain([1, maxValue]).range([1, 8]);
  }

  // Populate nodeElements from circleRefs after they mount
  $: {
    if (circleRefs.length != 0 && circleRefs.length === nodes.length) {
      nodeElements = {};
      nodes.forEach((node, i) => {
        nodeElements[node.id] = circleRefs[i];
      });
    }
  }

  // trigger redrawing on screen resize
  $: if (simulation && width && height) {
    simulation.force("center", d3.forceCenter(width / 2, height / 2));
    simulation.alpha(0.3).restart();
  }

  function change_country(data) {
    cntry = data[0];
    current_data = data[1];
    setupSimulation(data[1]);
  }

  function change_years(selected_years) {
    if (!current_data || !simulation) return;

    // Convert the year-month range to comparable Date objects
    const start = new Date(selected_years[0].replace("-", "/") + "/01");
    const end = new Date(selected_years[1].replace("-", "/") + "/01");

    // Filter data within range
    const filtered = current_data.filter((d) => {
      const date = new Date(`${d.Year}/${parseInt(d.Month, 10)}/01`);
      return date >= start && date <= end;
    });

    // Construct new nodes and links from filtered data
    const { nodes: newNodes, links: newLinks } = constructNodesAndLinks(
      filtered,
      actors,
    );

    // --- instead of rebuilding simulation, just update data ---
    // Preserve old positions if possible (to avoid jumpy motion)
    const nodeMap = new Map(nodes.map((d) => [d.id, d]));
    newNodes.forEach((n) => {
      if (nodeMap.has(n.id)) {
        const old = nodeMap.get(n.id);
        n.x = old.x;
        n.y = old.y;
        n.vx = old.vx || 0;
        n.vy = old.vy || 0;
      }
    });

    // Update global references
    nodes = newNodes;
    links = newLinks;
    renderedLinks = newLinks;

    // Update simulation data
    simulation.nodes(nodes);
    simulation.force("link").links(links);

    // Slightly reheat the simulation
    simulation.alpha(0.5).restart();

    // Update nodeElements to reflect new nodes
    nodeElements = {};
    nodes.forEach((node, i) => {
      nodeElements[node.id] = circleRefs[i];
    });
  }

  $: if (textRefs.length > 0) {
    textBBoxes = textRefs.map(
      (el) => el?.getBBox?.() || { width: 0, height: 0 },
    );
  }
</script>

<main bind:clientHeight={height} bind:clientWidth={width}>
  <!-- <div class="blog">ewofijweoijfoweijfo</div> -->
  <div class="visualization">
    <div id="button_container">
      {#each russia_conflicts as r}
        <button
          on:click={() => change_country(r)}
          class:selected={cntry === r[0]}>{r[0]}</button
        >
      {/each}
    </div>
    <svg bind:this={svgEl} {width} {height}>
      <g bind:this={gEl}>
        {#each renderedLinks as l (l.source.id + "-" + l.target.id)}
          <line
            stroke-opacity={opacityScale(l.value)}
            stroke-width={widthScale(l.value)}
            x1={l.source.x}
            y1={l.source.y}
            x2={l.target.x}
            y2={l.target.y}
            stroke="white"
          />
        {/each}

        {#each nodes as node, i (node.id)}
          <g>
            <circle
              bind:this={circleRefs[i]}
              cx={node.x}
              cy={node.y}
              r="4"
              fill="black"
              stroke="white"
              on:mousedown|preventDefault
            >
              <title>{node.id}</title>
            </circle>

            {#if textBBoxes[i]}
              <rect
                x={node.x - textBBoxes[i].width / 2 - 4}
                y={node.y + 15 - textBBoxes[i].height + 4}
                width={textBBoxes[i].width + 8}
                height={textBBoxes[i].height}
                fill="#001C23"
                opacity="0.4"
                rx="1"
                ry="1"
              />
            {/if}

            <text
              bind:this={textRefs[i]}
              x={node.x}
              y={node.y + 15}
              text-anchor="middle"
              fill="white"
              stroke="black"
              stroke-width="2"
              paint-order="stroke fill"
              font-size="12"
              font-family="Montserrat"
            >
              {node.name}
            </text>
          </g>
        {/each}
      </g>
    </svg>
  </div>
  <!-- <div class="blog">ewofijweoijfoweijfo</div> -->
</main>
{#if allYearMonthPairs.length > 0}
  <Timeline
    {width}
    {margin}
    {russia_present}
    {allYearMonthPairs}
    {cntry}
    on:yearsSelected={(e) => change_years(e.detail.years)}
  />
{/if}

<style>
  main {
    width: 100%;
    height: 80vh;
  }

  .blog {
    width: 100%;
    height: 500px;
    background-color: #001c23;
  }

  #button_container {
    width: 100%;
    text-align: center;
    position: relative;
    top: 2px;
    left: 2px;
  }

  button {
    background-color: #001c23;
    border: solid 1px rgb(58, 58, 58);
    color: white;
    padding: 4px 20px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
    font-family: "Montserrat";
    font-weight: 500;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background-color: yellow;
    color: black;
  }

  .selected {
    background-color: yellow;
    color: black;
  }
</style>
