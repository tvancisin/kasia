import * as d3 from "d3";

async function getIndividualCSV(path) {
    let loadedData = await d3.csv(path);
    return loadedData;
}

export async function getCSV(paths) {
    const promises = paths.map(path => getIndividualCSV(path));
    const results = await Promise.all(promises);
    return results;
}

async function getIndividualJSON(path) {
    let loadedData = await d3.json(path);
    return loadedData;
}

export async function getGeo(paths) {
    const promises = paths.map(path => getIndividualJSON(path));
    const results = await Promise.all(promises);
    return results;
}

export function constructNodesAndLinks(data, actors) {
    const nodes = [];
    const links = [];
    const seenNodes = new Set();
    const linkMap = new Map();

    // Map GLOPAD_ID → full actor object
    const actorMap = new Map();
    actors.forEach((actor) => {
        actorMap.set(actor.GLOPAD_ID, actor);
    });

    data.forEach((d) => {
        if (!d.third_party_id_GLOPAD) return;

        const ids = d.third_party_id_GLOPAD.split(";").filter(Boolean);

        // Create nodes
        ids.forEach((id) => {
            if (!seenNodes.has(id)) {
                seenNodes.add(id);

                const actor = actorMap.get(id);

                const actorName = actor?.ActorName || id;
                const group = actor?.actor_classification_glopad || "actor";

                nodes.push({
                    id,
                    name: actorName,
                    group
                });
            }
        });

        // Create pairwise links
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const source = ids[i];
                const target = ids[j];
                const key = [source, target].sort().join("->");

                if (linkMap.has(key)) {
                    linkMap.get(key).value += 1;
                } else {
                    const link = { source, target, value: 1 };
                    links.push(link);
                    linkMap.set(key, link);
                }
            }
        }
    });

    return { nodes, links };
}
