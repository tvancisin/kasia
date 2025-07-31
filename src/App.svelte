<script>
  import * as d3 from "d3";
  import { onMount, tick } from "svelte";
  import { getCSV, constructNodesAndLinks } from "./utils";

  let svgEl;
  let gEl;

  let width = 600;
  let height = 400;

  let renderedLinks = [];

  // We will populate this with DOM elements keyed by node ID
  let nodeElements = {};

  // This array of references will hold the <circle> DOM elements
  let circleRefs = [];

  let simulation, nodes, links, maxValue;

  onMount(async () => {
    // load and prepare data
    let [mend, actors] = await getCSV(["./mend.csv", "./actors.csv"]);
    let russia = actors.find((d) => d.ActorName === "Russia")?.GLOPAD_ID;
    let russia_present = mend.filter((item) =>
      item.third_party_id_GLOPAD?.split(";").includes(russia),
    );
    let russia_conflicts = d3.groups(russia_present, (d) => d.conflict_country);
    let selected = russia_conflicts[5][1]; // change as needed

    // calculate nodes and links
    let { nodes: ns, links: ls } = constructNodesAndLinks(selected, actors);
    nodes = ns;
    links = ls;

    // simulation
    maxValue = Math.max(...links.map((l) => l.value));
    let strengthScale = d3
      .scaleLinear()
      .domain([1, maxValue])
      .range([0.1, 0.15]);

    let linkForce = d3
      .forceLink(links)
      .id((d) => d.id)
      .strength((link) => strengthScale(link.value));

    simulation = d3
      .forceSimulation(nodes)
      .force("link", linkForce)
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .on("tick", () => {
        nodes = [...nodes];
        nodes.forEach((d) => {
          d.x = Math.max(5, Math.min(width - 20, d.x));
          d.y = Math.max(5, Math.min(height - 20, d.y));
        });
        renderedLinks = linkForce.links();
      });

    await tick(); // wait for DOM

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

    // zooming
    d3.select(svgEl).call(
      d3.zoom().on("zoom", (event) => {
        gEl.setAttribute("transform", event.transform);
      }),
    );
  });

  let opacityScale, widthScale;
  $: if (maxValue) {
    opacityScale = d3.scaleLinear().domain([1, maxValue]).range([0.3, 1]);
    widthScale = d3.scaleLinear().domain([1, maxValue]).range([1, 8]);
  }

  // ✅ Populate nodeElements from circleRefs after they mount
  $: {
    if (circleRefs.length != 0 && circleRefs.length === nodes.length) {
      nodeElements = {};
      nodes.forEach((node, i) => {
        nodeElements[node.id] = circleRefs[i];
      });
    }
  }


  $:  console.log(width);
  
</script>

<main bind:clientHeight={height} bind:clientWidth={width}>
  <svg bind:this={svgEl} {width} {height} style="border: 1px solid #ccc;">
    <g bind:this={gEl}>
      {#each renderedLinks as l (l.source.id + "-" + l.target.id)}
        <line
          stroke-opacity={opacityScale(l.value)}
          stroke-width={widthScale(l.value)}
          x1={l.source.x}
          y1={l.source.y}
          x2={l.target.x}
          y2={l.target.y}
          stroke="#aaa"
        />
      {/each}

      {#each nodes as node, i (node.id)}
        <circle
          bind:this={circleRefs[i]}
          cx={node.x}
          cy={node.y}
          r="5"
          fill="black"
          on:mousedown|preventDefault
        >
          <title>{node.id}</title>
        </circle>
        <text
          x={node.x}
          y={node.y + 15}
          text-anchor="middle"
          fill="black"
          font-size="12"
          font-weight="500"
          font-family="Montserrat"
        >
          {node.name}
        </text>
      {/each}
    </g>
  </svg>
</main>

<style>
  main {
    width: 100%;
    height: 100vh;
  }
</style>
