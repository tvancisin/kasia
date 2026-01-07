<script>
  import * as d3 from "d3";
  import { onMount, tick } from "svelte";
  import {
    getCSV,
    constructNodesAndLinks,
    getGeo,
    contentByCountry,
    contentByPeriod,
  } from "./utils";
  import Timeline from "./lib/Timeline.svelte";
  import OverallTimeline from "./lib/OverallTimeline.svelte";
  import Matrix from "./lib/Matrix.svelte";
  import { selectedYearsStore } from "./years";

  let selected_country = "ag";
  let selected_period = "am2023";
  // reactive subscription
  $: selectedPeriod = $selectedYearsStore;

  // subscribe to store
  $: if ($selectedYearsStore.startDate && $selectedYearsStore.endDate) {
    filterDataByDate(
      $selectedYearsStore.startDate,
      $selectedYearsStore.endDate,
    );
  }

  function filterDataByDate(startDate, endDate) {
    if (!current_data || !simulation) return;

    const filtered = current_data.filter((d) => {
      const day = d.Day ? parseInt(d.Day, 10) : 1;
      const month = d.Month ? parseInt(d.Month, 10) - 1 : 0; // JS months 0-indexed
      const year = d.Year ? parseInt(d.Year, 10) : 1970;
      const date = new Date(year, month, day);
      return date >= startDate && date <= endDate;
    });

    // build nodes & links
    const { nodes: newNodes, links: newLinks } = constructNodesAndLinks(
      filtered,
      actors,
    );

    // preserve old node positions if possible
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

    nodes = newNodes;
    links = newLinks;
    renderedLinks = newLinks;

    // update simulation
    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.alpha(0.5).restart();

    // update node elements references
    nodeElements = {};
    nodes.forEach((node, i) => {
      nodeElements[node.id] = circleRefs[i];
    });
  }

  // TODO
  // filter by number of connections

  let renderedLinks = [],
    renderedNodes = [],
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
    clean_mend,
    actors,
    svgEl,
    gEl,
    width,
    height = 600,
    filter_to_2324,
    current_data,
    margin = { top: 20, right: 50, bottom: 20, left: 85 },
    years = [],
    mediationOptions,
    allYearMonthPairs = [],
    cntry = "Sudan",
    medType = "All",
    russia_present = [],
    opacityScale,
    widthScale,
    // text boxes size calculation
    textRefs = [],
    textBBoxes = [],
    matrix_nodes,
    matrix_links,
    mGroup,
    mrGroup,
    allGroup,
    timelineRef;

  // init
  let miserables;
  onMount(async () => {
    // load the data
    [mend, actors] = await getCSV(["./mend_fix.csv", "./actors_updated.csv"]);
    clean_mend = mend.filter((d) => d.med_event_ID != "");

    filter_to_2324 = clean_mend.filter((d) => d.Year >= 2023);
    let russia = actors.find((d) => d.ActorName === "Russia")?.GLOPAD_ID;

    russia_present = filter_to_2324.filter((item) =>
      item.third_party_id_MEND?.split(";").includes(russia),
    );

    let m_mr_grouping = d3.groups(clean_mend, (d) => d.med_type);
    mGroup = m_mr_grouping.find((r) => r[0] === "M")?.[1] ?? [];
    mrGroup = m_mr_grouping.find((r) => r[0] === "MR")?.[1] ?? [];
    allGroup = [...mGroup, ...mrGroup]; // merged

    mediationOptions = [
      ["All", allGroup],
      ...m_mr_grouping.filter((r) => r[0] === "M" || r[0] === "MR"),
    ];

    russia_conflicts = d3.groups(russia_present, (d) => d.conflict_country);
    console.log(russia_conflicts);

    let selected = russia_conflicts[4][1];
    current_data = selected;

    // trigger simulation
    setupSimulation(selected);

    // timeline
    years = [...new Set(filter_to_2324.map((d) => d.Year))]; // Extract unique years
    allYearMonthPairs = years.flatMap((year) =>
      Array.from({ length: 12 }, (_, i) => `${year}-${i + 1}`),
    );

    [miserables] = await getGeo(["./matrix.json"]);
  });

  // simulation function
  async function setupSimulation(selected) {
    if (selected.length === 0) {
      return (nodes = []), (links = []);
    } else {
      let strength;
      if (selected[0].conflict_country == "Yemen") {
        strength = -500;
      } else if (selected[0].conflict_country == "Israel") {
        strength = -500;
      } else if (selected[0].conflict_country == "Sudan") {
        strength = -800;
      } else if (selected[0].conflict_country == "Afghanistan") {
        strength = -2500;
      } else {
        strength = -900;
      }

      // calculate nodes and links
      let { nodes: ns, links: ls } = constructNodesAndLinks(selected, actors);
      nodes = ns;
      links = ls;

      //matrix node_links
      let { nodes: mns, links: mls } = constructNodesAndLinks(selected, actors);
      matrix_nodes = mns;
      matrix_links = mls;

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
            d.y = Math.max(20, Math.min(height - 20, d.y));
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
  }

  $: if (maxValue) {
    // opacity adaptive max
    const maxOpacity = maxValue <= 1 ? 0.6 : maxValue <= 5 ? 0.8 : 1;

    opacityScale = d3
      .scaleLinear()
      .domain([1, maxValue])
      .range([0.1, maxOpacity]);

    // width adaptive max
    const maxWidth = maxValue <= 1 ? 1 : maxValue <= 5 ? 5 : 8;

    widthScale = d3.scaleLinear().domain([1, maxValue]).range([1, maxWidth]);
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
    medType = "All";
    cntry = data[0];
    current_data = data[1];
    setupSimulation(data[1]);
    timelineRef.clearBrush(); // clears brush
  }

  function change_mediation_type(type) {
    if (type == "All") {
      setupSimulation(current_data);
      timelineRef.clearBrush(); // clears brush
      return;
    } else {
      let new_data = current_data.filter((d) => d.med_type == type);
      setupSimulation(new_data);
      timelineRef.clearBrush(); // clears brush
    }
  }

  // Map option text for display
  function getOptionText(value) {
    if (value === "M") return "Mediation";
    if (value === "MR") return "Mediation-Related";
    return value; // for "All" or anything else
  }

  $: if (textRefs.length > 0) {
    textBBoxes = textRefs.map(
      (el) => el?.getBBox?.() || { width: 0, height: 0 },
    );
  }

  let minConnections = 1; // default slider value
  // filter links based on slider setting
  $: if (links) {
    renderedLinks = links.filter((l) => l.value >= minConnections);
    renderedNodes = nodes.filter((n) =>
      renderedLinks.some((l) => l.source.id === n.id || l.target.id === n.id),
    );
  }

  $: console.log(height);
</script>

<h1>Russia in Peace Mediation</h1>
<div class="blog_text">
  <p>
    MEND data has allowed us to track not only the activities of external
    diplomatic interventions in conflict, but also how they interact with other
    third parties. Understanding networks of third-party actors in conflicts is
    crucial to gaining an insight into the kinds of alliances and partnerships
    that are being forged towards conflict management and resolution and how
    these operate across regions. For policymakers, this is an integral tool to
    help devise strategic partnerships towards conflict mediation and resolution
    of Middle Eastern and North African conflicts.
  </p>
  <p>
    Here, we map Russian intervention networks across Middle Eastern and North
    African conflicts across 2023 and 2024. Using MEND data charting mediation
    and mediation-related activities undertaken by third-party conflict actors,
    Russian peace-making partnerships are tracked across conflicts involving
    Israel, Syria, Yemen, Libya, Sudan, and Afghanistan. The intensity of
    interactions with other third parties is revealed by the width of connecting
    lines in the interactive diagrams and can be manipulated using the slider or
    the timeline. Comparisons can also be made regarding the types of actors
    with whom Russia collaborated across activity types:
  </p>
  <ul>
    <li>
      Mediation/shuttle mediation—when at least one external third party brokers
      talks between at least one belligerent and other local actors either in
      the same meeting or in quick succession
    </li>
    <br />
    <li>
      Mediation-related—where external a third party either coordinates with
      other external actors, meets with only one local conflict actor, holds
      consultations with non-belligerents, or is involved in a meeting related
      to an implementation mechanism.
    </li>
  </ul>

  <br />
  <br />
  <select id="country" bind:value={selected_country}>
    <option value="">— choose —</option>
    <option value="sd">Sudan</option>
    <option value="ym">Yemen</option>
    <option value="ag">Afghanistan</option>
    <option value="is">Israel</option>
    <option value="lb">Libya</option>
    <option value="sy">Syria</option>
  </select>

  {#if selected_country}
    <div class="content">
      <p>
        <strong>Activity Overview: </strong>
        {contentByCountry[selected_country].activity}
      </p>
      <p>
        <strong>Networks: </strong>
        {contentByCountry[selected_country].networks}
      </p>
    </div>
  {/if}
</div>
<div class="visualization">
  <div id="slider_container">
    <input
      id="connectionSlider"
      type="range"
      min="1"
      max={maxValue}
      step="1"
      bind:value={minConnections}
    />
    <label
      for="connectionSlider"
      style="color: rgb(195, 195, 195); font-size: 12px; margin-right: 2px;"
    >
      At least {minConnections}
      {minConnections > 1 ? "connections" : "connection"}
    </label>
  </div>

  <div id="dropdown_container">
    Select Country
    <select
      bind:value={cntry}
      on:change={() => {
        const selected = russia_conflicts.find((r) => r[0] === cntry);
        if (selected) change_country(selected);
      }}
    >
      {#each russia_conflicts as r}
        <option value={r[0]}>{r[0]}</option>
      {/each}
    </select>
  </div>

  <!-- MEDIATION TYPE DROPDOWN -->
  <div id="dropdown_container_2">
    Select Activity
    <select
      bind:value={medType}
      on:change={() => change_mediation_type(medType)}
    >
      {#each mediationOptions as m}
        <option value={m[0]}>{getOptionText(m[0])}</option>
      {/each}
    </select>
  </div>

  <div class="network" bind:clientHeight={height} bind:clientWidth={width}>
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

        {#each renderedNodes as node, i (node.id)}
          <g>
            <circle
              cx={node.x}
              cy={node.y}
              r={6}
              fill="#001C23"
              fill-opacity="0.5"
            />
            <circle
              bind:this={circleRefs[i]}
              cx={node.x}
              cy={node.y}
              r="4"
              fill="white"
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
                opacity="0.5"
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
              font-size="10"
              font-family="Montserrat"
            >
              {node.name}
            </text>
          </g>
        {/each}
      </g>
    </svg>
  </div>
  <Timeline
    bind:this={timelineRef}
    {width}
    {margin}
    {russia_present}
    {allYearMonthPairs}
    {cntry}
    {medType}
  />
</div>
<div class="blog_text">
  <p>
    The years 2023 and 2024 saw an increase in violent conflict across the
    Middle East and North Africa, especially in Gaza and Sudan. It was also
    punctuated by the apparent end of the ongoing conflict in Syria not due to a
    mediated, negotiated resolution, but rather the capitulation of the Assad
    regime after a swift and decisive rebel offensive. What has the
    international diplomatic response been towards these rapidly changing events
    across Middle Eastern and North African conflicts? And where does Russia fit
    in?
  </p>
  <p>
    The area chart below maps global diplomatic activities towards the conflicts
    in the Occupied Palestinian Territories/Israel, Syria, Yemen, Libya, Sudan,
    and Afghanistan. This includes both mediation and mediation-related events
    (please see above text for a definition of these activity-types).
  </p>
  <p>
    The area graph shows that global activity towards violent conflicts in the
    MENA region had five-six large spikes across the two years, with
    significantly increased efforts from August 2024 onwards. Generally, Russian
    activity across this period remained steady without major spikes. However,
    subtle patterns reveal that, much like the trends in global activity,
    Russian diplomacy intensified slightly in October 2023, August 2024, and
    October and November 2024.
  </p>

  <select id="periods" bind:value={selected_period}>
    <option value="">— choose —</option>
    <option value="am2023">April-May 2023</option>
    <option value="on2023">October-November 2023</option>
    <option value="jf2024">January-February 2024</option>
    <option value="ap2024">April 2024</option>
    <option value="ag2024">August 2024</option>
    <option value="od2024">October-December 2024</option>
  </select>

  {#if selected_period}
    <div class="content">
      <p>
        {contentByPeriod[selected_period].text}
      </p>
    </div>
  {/if}
</div>

<div class="visualization2">
  {#if clean_mend}
    <OverallTimeline
      {filter_to_2324}
      {russia_present}
      {width}
      {height}
      {margin}
    />
  {/if}
</div>

<!-- <div class="visualization">
  {#if matrix_nodes && matrix_links && miserables}
    <Matrix {miserables} {width} {height} {matrix_nodes} {matrix_links} />
  {/if}
</div> -->

<style>
  h1 {
    width: 80%;
    margin: 50px auto;
    text-align: center;
    color: white;
    font-family: "Montserrat", sans-serif;
  }

  .visualization {
    position: relative;
    width: 100%;
    height: 100vh;
  }

  .visualization2 {
    position: relative;
    width: 100%;
    height: 75vh;
  }

  .network {
    width: 100%;
    height: 69vh;
    background-color: #001c23;
  }

  .timeline {
    width: 100%;
    height: 19vh;
    background-color: #001c23;
  }

  .blog_text {
    width: 55%;
    color: white;
    font-family: "Montserrat", sans-serif;
    margin: 50px auto;
    text-align: justify;
  }

  @media (max-width: 768px) {
    .blog_text {
      width: 95%;
    }
  }

  #dropdown_container {
    color: rgb(195, 195, 195);
    font-family: "Montserrat";
    font-size: 12px;
    position: absolute;
    width: 180px;
    top: 2px;
    left: 2px;
  }

  #dropdown_container_2 {
    color: rgb(195, 195, 195);
    font-family: "Montserrat";
    font-size: 12px;
    position: absolute;
    width: 180px;
    top: 60px;
    left: 2px;
  }

  select {
    width: 100%;
    padding: 6px 10px;
    font-size: 14px;
    font-family: "Montserrat";
    font-weight: 500;
    background-color: #001c23;
    color: white;
    border: 1px solid rgb(58, 58, 58);
    border-radius: 4px;
    cursor: pointer;
  }

  select:hover {
    background-color: #001c23;
    color: white;
  }

  #slider_container {
    position: absolute;
    top: 10px;
    right: 10px;
    color: white;
    font-family: "Montserrat";
    font-size: 14px;
    display: flex;
    flex-direction: column; /* stack children vertically */
    align-items: center;
  }
</style>
