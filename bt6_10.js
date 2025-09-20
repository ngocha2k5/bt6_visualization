// bt6_10.js — Small-multiples line charts (Câu 10) with group order, centered titles, custom Y for BOT
function drawChart10() {
  d3.csv("bt6.csv").then(raw => {
    // --- PREPARE ROWS (row-level month) ---
    const rows = raw.map(r => {
      const orderId = (r["Mã đơn hàng"] || "").toString().trim();
      const dt = new Date(r["Thời gian tạo đơn"]);
      const month = isNaN(dt) ? null : dt.getMonth() + 1;
      const group = `[${(r["Mã nhóm hàng"] || "").trim()}] ${(r["Tên nhóm hàng"] || "").trim()}`;
      const item = `[${(r["Mã mặt hàng"] || "").trim()}] ${(r["Tên mặt hàng"] || "").trim()}`;
      return { orderId, dt, month, group, item };
    }).filter(r => r.orderId && r.month && r.group && r.item);

    // --- COUNT unique orders per (month,group) and per (month,group,item) ---
    const denomSets = new Map();
    const numerSets = new Map();
    const groupsSet = new Set();
    const itemsSet = new Set();

    rows.forEach(r => {
      const m = r.month, g = r.group, it = r.item, oid = r.orderId;
      groupsSet.add(g); itemsSet.add(it);

      const dk = `${m}|${g}`;
      if (!denomSets.has(dk)) denomSets.set(dk, new Set());
      denomSets.get(dk).add(oid);

      const nk = `${m}|${g}|${it}`;
      if (!numerSets.has(nk)) numerSets.set(nk, new Set());
      numerSets.get(nk).add(oid);
    });

    // --- BUILD series ---
    const months = d3.range(1,13);
    const allGroups = Array.from(groupsSet);

    // Sắp xếp nhóm theo yêu cầu
    const groupOrder = ["[BOT] Bột","[SET] Set trà","[THO] Trà hoa","[TMX] Trà mix","[TTC] Trà củ, quả sấy"];
    const orderedGroups = groupOrder.filter(g => allGroups.includes(g));

    const allItems = Array.from(itemsSet).sort();
    const color = d3.scaleOrdinal().domain(allItems).range(d3.schemeTableau10.concat(d3.schemeCategory10).flat());

    const nested = orderedGroups.map(g => {
      const itemsInGroup = new Set();
      numerSets.forEach((set, key) => {
        const parts = key.split("|");
        if (parts.length >= 3) {
          const m = +parts[0], gg = parts[1], it = parts.slice(2).join("|");
          if (gg === g) itemsInGroup.add(it);
        }
      });
      const items = Array.from(itemsInGroup).sort();
      const itemsSeries = items.map(it => {
        const values = months.map(m => {
          const denom = denomSets.get(`${m}|${g}`) ? denomSets.get(`${m}|${g}`).size : 0;
          const numer = numerSets.get(`${m}|${g}|${it}`) ? numerSets.get(`${m}|${g}|${it}`).size : 0;
          const prob = denom > 0 ? numer / denom : 0;
          return { month: m, prob: prob };
        });
        return { item: it, values: values };
      });
      return { group: g, items: itemsSeries };
    });

    // --- LAYOUT ---
    const numCols = 3, numRows = 2;
    const cellW = 320, cellH = 220;
    const margin = { top: 40, right: 20, bottom: 36, left: 48 };

    d3.select("#chart10-container").selectAll("*").remove();
    const container = d3.select("#chart10-container").style("display","flex").style("justify-content","center");
    const svg = container.append("svg")
      .attr("width", numCols * cellW)
      .attr("height", numRows * cellH);

    const tooltip = d3.select("body").append("div")
      .attr("class","chart-tooltip")
      .style("position","absolute")
      .style("background","#fff")
      .style("border","1px solid #ccc")
      .style("padding","8px 12px")
      .style("border-radius","6px")
      .style("box-shadow","0 2px 6px rgba(0,0,0,0.12)")
      .style("pointer-events","none")
      .style("opacity",0);

    // Draw each small multiple
    nested.forEach((gObj, idx) => {
      const row = Math.floor(idx / numCols);
      const col = idx % numCols;
      const gx = svg.append("g").attr("transform", `translate(${col * cellW}, ${row * cellH})`);

      const innerW = cellW - margin.left - margin.right;
      const innerH = cellH - margin.top - margin.bottom;

      const x = d3.scalePoint().domain(months).range([0, innerW]).padding(0.5);

      // Tính maxVal
      let maxVal = 0;
      gObj.items.forEach(it => it.values.forEach(v => { if (v.prob > maxVal) maxVal = v.prob; }));

      let y;
      if (gObj.group.startsWith("[BOT]")) {
        // Nhóm Bột: luôn ~100% → zoom quanh 100%
        y = d3.scaleLinear().domain([0.9, 1.0]).range([innerH, 0]);
      } else {
        const yMax = maxVal > 0 ? Math.min(1, maxVal * 1.15) : 0.1;
        y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]).nice();
      }

      const g = gx.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      // Axes
      g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickFormat(m => "T" + String(m).padStart(2,"0")));
      g.append("g")
        .call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

      const line = d3.line().x(d => x(d.month)).y(d => y(d.prob));

      gObj.items.forEach(itemObj => {
        const c = color(itemObj.item);
        g.append("path")
          .datum(itemObj.values)
          .attr("fill","none")
          .attr("stroke",c)
          .attr("stroke-width",1.6)
          .attr("d",line);
        g.selectAll(null)
          .data(itemObj.values)
          .enter()
          .append("circle")
          .attr("cx", d => x(d.month))
          .attr("cy", d => y(d.prob))
          .attr("r",2.6)
          .attr("fill",c);
      });

      // Overlay per month
      const bandW = innerW / months.length;
      g.selectAll("rect.overlay")
        .data(months)
        .enter()
        .append("rect")
        .attr("x", m => x(m) - bandW/2)
        .attr("y", 0)
        .attr("width", bandW)
        .attr("height", innerH)
        .style("fill","transparent")
        .on("mouseover", (event,m) => {
          tooltip.transition().duration(60).style("opacity",1);
          let html = `<div><strong>Tháng ${String(m).padStart(2,"0")}</strong></div>`;
          gObj.items.forEach(it => {
            const v = it.values.find(vv => vv.month===m);
            const pct = v ? (v.prob*100).toFixed(1) : "0.0";
            html += `<div>${it.item} <strong>${pct}%</strong></div>`;
          });
          tooltip.html(html)
            .style("left",(event.pageX+12)+"px")
            .style("top",(event.pageY-10)+"px");
        })
        .on("mousemove", event => {
          tooltip.style("left",(event.pageX+12)+"px").style("top",(event.pageY-10)+"px");
        })
        .on("mouseout", () => tooltip.transition().duration(60).style("opacity",0));

      // Title căn giữa
      gx.append("text")
        .attr("x", cellW/2)
        .attr("y", 20)
        .attr("text-anchor","middle")
        .style("font-weight","bold")
        .style("font-size","12px")
        .text(gObj.group);
    });
  });
}

// Gọi
drawChart10();
