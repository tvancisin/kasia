<script>
  import { onMount, tick } from 'svelte';
  import * as d3 from 'd3';

  let svgEl;
  let gEl;

  const width = 600;
  const height = 400;

  let nodes = [
    { id: 'A' },
    { id: 'B' },
    { id: 'C' },
    { id: 'D' }
  ];

  let links = [
    { source: 'A', target: 'B' },
    { source: 'A', target: 'C' },
    { source: 'B', target: 'D' }
  ];

  let renderedLinks = [];

  // We will populate this with DOM elements keyed by node ID
  let nodeElements = {};

  // This array of references will hold the <circle> DOM elements
  let circleRefs = [];

  let simulation;

  onMount(async () => {
    const linkForce = d3.forceLink(links)
      .id(d => d.id)
      .distance(100);

    simulation = d3.forceSimulation(nodes)
      .force('link', linkForce)
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .on('tick', () => {
        nodes = [...nodes];
        renderedLinks = linkForce.links();
      });

    await tick(); // wait for DOM

    const drag = d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
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

    d3.select(svgEl).call(
      d3.zoom().on('zoom', (event) => {
        gEl.setAttribute('transform', event.transform);
      })
    );
  });

  // ✅ Populate nodeElements from circleRefs after they mount
  $: {
    if (circleRefs.length === nodes.length) {
      nodeElements = {};
      nodes.forEach((node, i) => {
        nodeElements[node.id] = circleRefs[i];
      });
    }
  }
</script>

<svg bind:this={svgEl} width={width} height={height} style="border: 1px solid #ccc;">
  <g bind:this={gEl}>
    {#each renderedLinks as l (l.source.id + '-' + l.target.id)}
      <line
        x1={l.source.x}
        y1={l.source.y}
        x2={l.target.x}
        y2={l.target.y}
        stroke="#aaa"
        stroke-width="1.5"
      />
    {/each}

    {#each nodes as node, i (node.id)}
      <circle
        bind:this={circleRefs[i]}
        cx={node.x}
        cy={node.y}
        r="10"
        fill="#69b3a2"
        on:mousedown|preventDefault
      >
        <title>{node.id}</title>
      </circle>
    {/each}
  </g>
</svg>
