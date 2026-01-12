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
        if (!d.third_party_id_MEND) return;

        const ids = d.third_party_id_MEND.split(";").filter(Boolean);

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

export const contentByCountry = {
    sd: {
        name: "Sudan",
        activity: "Moscow engaged diplomatically with the conflict in Sudan only six times across 2023-2024. Of these events, none were considered full mediation. Accordingly, Russia was not involved in any peace agreements during this period.",
        networks: "Despite the outbreak of the most recent civil war in April 2023, Russian engagement with the conflict in Sudan is relatively low. While Russia acted alone in half of the recorded events, Moscow’s peace-making partnerships towards Sudan appear quite broad. This is because a singular event on 25th July 2024 brought together the UNSG Personal Envoy initiative, AU High-Level Panel on Sudan, and IGAD initiative. Russia most frequently partnered with the United Nations Security Council’s permanent five members: China, France, the United Kingdom, and United States. Of these actors, Moscow partnered most often with China."
    },
    ym: {
        name: "Yemen",
        activity: "Russia engaged diplomatically with the Yemen conflict only nine times across 2023 and 2024. Of these nine events, only one was an instance of shuttle mediation, during which Russia met with Yemen’s Presidential Leadership Council. Russia was not involved in any peace agreements during this period.",
        networks: "Except for two mediation-related events, Russia only ever collaborated with the Office of the Special Envoy of the Secretaty-General for Yemen (OSESG-Yemen) in its efforts towards conflict resolution and management in Yemen. In two separate events, Moscow cooperated with the United Arab Emirates and Kuwait during mediation-related activities. The singular mediation event demonstrates limited but decisive cooperation with other permanent members of the United Nations Security Council (P5): France, the United Kingdom, China, and the United States. The P5 supported Hans Grundberg during a meeting with Yemen’s Presidential Leadership Council in Riyadh, Saudi Arabia."
    },
    ag: {
        name: "Afghanistan",
        activity: "Moscow engaged diplomatically with the conflict in Afghanistan only nine times across 2023-2024. Of these nine events, only one was an instance of shuttle mediation, during which Russia met with the National Resistance Front. Russia was not involved in any peace agreements during this period.",
        networks: "Interestingly, despite the relatively few recorded events in which Russia played a peace-making role, its involvement in peace-making and peacebuilding in Afghanistan is far reaching. This is not only due to its leadership of the Moscow Format, one of the main dialogue platforms for peace in Afghanistan, but also because of the number of partners within its peace-making network towards this conflict. With just under 30 partners, Russia cooperated with partners across Eastern, Southern, Southeastern and Central Asia, the Middle East, Europe, the United States, and various international governmental organisations such as the European Union, United Nations, Organisation of Islamic Cooperation, and the Shanghai Cooperation Organization. Moscow most often collaborated with China, Pakistan and Iran, with these actors featuring in partnerships with Russia between six and seven times over the two years.  Also of note is that despite its far-reaching partnerships during mediation-related activities, Russian mediation in Afghanistan was conducted without partners."
    },
    is: {
        name: "Israel",
        activity: "Moscow engaged diplomatically with the conflicts involving Israel 40 times across 2023-2024. Of these 40 events, nine were instances of mediation, most of which were conducted in a shuttle format where third parties would meet with one belligerent at a time. During these mediation efforts, Russia engaged with Israel, the Palestinian National Authority, Iran, and Hamas. Russia was not involved in any peace agreements during this period.",
        networks: "Due to the degree of devastation in Gaza and the regional spill over of the conflict, diverse global actors have committed to participating in peace processes associated with conflicts involving Israel, reflected in the network diagram. Russia most frequently partnered with Egypt, one of the main mediators of the negotiations over Gaza; this occurred 12 times. Aside from Egypt, the actors with which Moscow partnered at least three times include: China, Brazil, Iran, the United Arab Emirates, South Africa, India, Japan, Jordan, and Saudi Arabia. This indicates Moscow’s preference to cooperate with the BRICS and regional states over the myriad conflicts in which Israel is one of the main belligerents. Interestingly, despite intensive cooperation with these actors during mediation-related activities, Russia engaged in full mediation alone."
    },
    lb: {
        name: "Libya",
        activity: "Moscow engaged diplomatically with the conflict in Libya 11 times across 2023-2024. Of these 11 events, only one was an instance of mediation, during which Russia met with the Libyan Government of National Accord (GNA), the Libyan National Army—headed by General Khalifa Haftar—and the Libyan Government of National Unity (GNU). Russia was not involved in any peace agreements during this period.",
        networks: "Across these events, Russia only once appeared with numerous partners from across the Middle East, Africa, and Europe, as well as China. Moscow also collaborated with regional organisations, such as the African Union, League of Arab States, and the Gulf Cooperation Council. In two meetings, Russia worked alongside the United Nations Support Mission in Libya (UNSMIL). The singular mediation event involved a plethora of actors in partnership with Russia as this was a meeting associated with the International Follow-Up Committee on Libya (IFC) and UNSMIL process."
    },
    sy: {
        name: "Syria",
        activity: "MEND recorded 41 instances of Russian mediation and mediation-related activities towards Syria between January 2023 and December 2024. Of these events, 14 were considered mediation events, while the remaining 27 were mediation-related activities. Russia was not involved in any peace agreements during this period.",
        networks: "Over Syria, Russia collaborated predominantly with regional actors, with the exception of the United States, United Kingdom, and the UN Secretary General’s Special Envoy to Syria. It is unsurprising that Russia cooperated most intensively with Turkey and Iran (Islamic Republic of), the other members of the Astana Trio that headed an alternative peace process to that led by the UN. Across this period, Russia interacted with Turkey 15 times and Iran 16 times. Russia collaborated with regional states and the UNSG’s Special Envoy to Syria during mediation events and most intensively cooperated with Iran. Russia collaborated with Iran nine times and cooperated with Turkey (Russia’s second most significant conflict resolution partner in Syria) only three times."
    },
};


export const contentByPeriod = {
    am2023: {
        name: "April-May 2023",
        text: "Global activity increased towards the conflict in Sudan in response to the outbreak of the most recent major civil war between the Sudanese Armed Forces and the Rapid Support Forces. Interestingly, Russia did not contribute to any recorded mediation or mediation-related events towards to the conflict in Sudan in these months."
    },
    on2023: {
        name: "October-November 2023",
        text: "Increased global mediation and mediation-related activity during this spike was related to the outbreak of conflict in the aftermath of the October 7 attacks on Israel by Hamas. Reflecting the global reaction to the escalation in violence, all recorded Russian activities (except two) during these months were related to this conflict."
    },
    jf2024: {
        name: "January-February 2024",
        text: "Across January and February, global efforts were sustained towards conflicts related to Israel, Sudan, Libya, Afghanistan, and Yemen. The IGAD-led peace process was particularly active towards Sudan in January, while in February it was the Juba Peace process. The UNSMIL process towards Libya was active in January, and talks brokered by Qatar, Egypt, and the USA towards the war on Gaza were underway across the two months. Russian activity was minimal."
    },
    ap2024: {
        name: "April 2024",
        text: "Global efforts intensified towards the conflicts related to Israel as regional actors became swept into the violence. Iran led missile and drone attacks on Israel in response to Israeli attacks on Iranian targets in Syria, which was the main topic of Russian activity during this month. Fighting with Hezbollah also intensified and Israel conducted large-scale incursions into the West Bank while sustaining catastrophic levels of violence on Gaza. Much of the diplomatic activity was related to negotiations about an elusive ceasefire, as well as the successful brokering of humanitarian access agreements."
    },
    ag2024: {
        name: "August 2024",
        text: "Increased activity in August was directed towards conflicts in which Israel is a main belligerent. The sharp incline in global and Russian mediation and mediation-related events coincided with Israel’s large-scale offensive on the West Bank, described as “Operation Summer Camps”. In the context of the ongoing war on Gaza and aggression towards regional states, this exacerbated regional tensions. This activity spike from August until the end of the year, also coincided with the declaration of famine in Sudan and deadly floods; fighting intensified and humanitarian access was blocked in many regions. "
    },
    od2024: {
        name: "October-December 2024",
        text: "Mediation and mediation-related activities towards the conflict in Sudan increased in September. While efforts towards conflicts related to Israel and Sudan were largely sustained into October, diplomatic activity towards Yemen increased, as the Office of the Special Envoy of the Secretary General for Yemen conducted consultations with Yemeni actors in Amman. Russia also held the Moscow Format on Afghanistan in October, and intensified efforts towards the conflicts related to Israel and Yemen. November saw sustained efforts particularly towards conflicts associated with Israel and Sudan. Increased focus was on the conflict in Syria, especially towards the end of November, due to the outbreak of the rebel offensive. Accordingly, Russian activity towards the conflicts related to Syria and Israel intensified in November. Most events in December were related to the conflict in Syria and the Syrian regime’s capitulation, which accounts for all Russia’s activity in this month."
    },
};