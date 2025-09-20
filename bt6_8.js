// bt6_8.js — Line chart (zigzag), legend title "Nhóm hàng" with colored dots
function drawChart8() {
  d3.csv("bt6.csv").then(raw => {
    // --- prepare orders (group by order id, earliest datetime, groups set) ---
    const orders = new Map();
    raw.forEach(r => {
      const orderId = r["Mã đơn hàng"];
      if (!orderId) return;
      const dt = new Date(r["Thời gian tạo đơn"]);
      const month = isNaN(dt) ? null : dt.getMonth() + 1;
      const code = (r["Mã nhóm hàng"] || "").toString().trim();
      const name = (r["Tên nhóm hàng"] || "").toString().trim();
      const groupLabel = `[${code}] ${name}`;

      if (!orders.has(orderId)) {
        orders.set(orderId, { minDt: dt, month: month, groups: new Set([groupLabel]) });
      } else {
        const e = orders.get(orderId);
        if (!isNaN(dt) && (isNaN(e.minDt) || dt < e.minDt)) {
          e.minDt = dt; e.month = dt.getMonth() + 1;
        }
        e.groups.add(groupLabel);
      }
    });

    // collect groups and ensure preferred order if present
    const allGroupsSet = new Set();
    for (const [, entry] of orders) {
      entry.groups.forEach(g => allGroupsSet.add(g));
    }
    const groupsFound = Array.from(allGroupsSet).sort();

    // preferred order as in report (keeps only present ones)
    const preferred = ["[BOT] Bột","[SET] Set trà","[THO] Trà hoa","[TMX] Trà mix","[TTC] Trà củ, quả sấy"];
    const orderedGroups = preferred.filter(g => allGroupsSet.has(g)).concat(groupsFound.filter(g => !preferred.includes(g)));

    // months 1..12
    const months = Array.from({length:12}, (_,i) => i+1);

    // totals and counts
    const totalsByMonth = new Map();
    months.forEach(m => totalsByMonth.set(m, 0));
    const countsByMonthGroup = new Map(); // key "m|group" -> count of orders containing group in month m

    for (const [, entry] of orders) {
      const m = entry.month;
      if (!m || m < 1 || m > 12) continue;
      totalsByMonth.set(m, (totalsByMonth.get(m) || 0) + 1);
      entry.groups.forEach(g => {
        const key = `${m}|${g}`;
        countsByMonthGroup.set(key, (countsByMonthGroup.get(key) || 0) + 1);
      });
    }

    // build data rows: row[ group ] = prob (orders_with_group / total_orders_in_month)
    const data = months.map(m => {
      const total = totalsByMonth.get(m) || 0;
      const row = { month: m };
      orderedGroups.forEach(g => {
        const cnt = countsByMonthGroup.get(`${m}|${g}`) || 0;
        row[g] = total > 0 ? (cnt / total) : 0;
      });
      return row;
    });

    // --- draw chart ---
    const margin = { top: 30, right: 200, bottom: 60, left: 60 };
    const width = 900 - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom;

    d3.select("#chart8-container").selectAll("*").remove();
    d3.selectAll(".chart-tooltip").remove();

    const svg = d3.select("#chart8-container")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
      .domain(data.map(d => d.month))
      .range([0, width])
      .padding(0.5);

    // y domain: use max across data (or 1 if none)
    const maxVal = d3.max(data, d => d3.max(orderedGroups.map(g => d[g] || 0))) || 1;
    const y = d3.scaleLinear()
      .domain([0, Math.max(maxVal, 0.01)]) // avoid 0-only domain
      .nice()
      .range([height, 0]);

    const color = d3.scaleOrdinal()
      .domain(orderedGroups)
      .range(d3.schemeTableau10);

    // axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(m => "Tháng " + String(m).padStart(2, "0")));

    svg.append("g")
      .call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

    // line generator (no curve => zigzag)
    const line = d3.line()
      .x(d => x(d.month))
      .y(d => y(d.value));

    // series build
    const series = orderedGroups.map(g => ({
      key: g,
      values: data.map(d => ({ month: d.month, value: d[g] || 0 }))
    }));

    // draw lines (zigzag)
    svg.selectAll(".line")
      .data(series)
      .enter()
      .append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", d => color(d.key))
        .attr("stroke-width", 2)
        .attr("d", d => line(d.values));

    // draw point markers
    series.forEach(s => {
      svg.selectAll(".points-" + s.key.replace(/\W/g,"_"))
        .data(s.values)
        .enter()
        .append("circle")
          .attr("cx", d => x(d.month))
          .attr("cy", d => y(d.value))
          .attr("r", 3)
          .attr("fill", color(s.key));
    });

    // tooltip: overlay per-month area
    const bandPositions = data.map(d => x(d.month));
    const spacing = data.length > 1 ? (bandPositions[1] - bandPositions[0]) : width;
    const bandW = Math.max( spacing * 0.95, 20 );

    const tooltip = d3.select("body").append("div")
      .attr("class", "chart-tooltip")
      .style("position","absolute")
      .style("background","#fff")
      .style("border","1px solid #ccc")
      .style("padding","8px 12px")
      .style("border-radius","6px")
      .style("box-shadow","0 2px 6px rgba(0,0,0,0.12)")
      .style("pointer-events","none")
      .style("opacity",0);

    svg.selectAll("rect.overlay")
      .data(data)
      .enter()
      .append("rect")
        .attr("class","overlay")
        .attr("x", d => x(d.month) - bandW/2)
        .attr("y", 0)
        .attr("width", bandW)
        .attr("height", height)
        .style("fill","transparent")
        .on("mouseover", function(event, d) {
          tooltip.transition().duration(80).style("opacity",1);
          let html = `<div style="font-weight:600">Tháng ${String(d.month).padStart(2,"0")}</div>`;
          orderedGroups.forEach(g => {
            const pct = Math.round((d[g] || 0) * 100);
            html += `<div style="display:flex;justify-content:space-between;min-width:220px"><div>${g}</div><div>${pct}%</div></div>`;
          });
          tooltip.html(html)
            .style("left",(event.pageX + 12) + "px")
            .style("top",(event.pageY - 10) + "px");
        })
        .on("mousemove", function(event) {
          tooltip.style("left",(event.pageX + 12) + "px").style("top",(event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          tooltip.transition().duration(80).style("opacity",0);
        });

    // Legend with title "Nhóm hàng" and colored dots
    const legend = svg.append("g").attr("transform", `translate(${width + 20}, 0)`);

    legend.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .style("font-weight","bold")
      .style("font-size","12px")
      .text("Nhóm hàng");

    orderedGroups.forEach((g, i) => {
      const lg = legend.append("g").attr("transform", `translate(0, ${i * 22})`);
      lg.append("circle")
        .attr("cx", 6)
        .attr("cy", 6)
        .attr("r", 6)
        .style("fill", color(g));
      lg.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .style("font-size", "11px")
        .text(g);
    });
  }).catch(err => {
    console.error("Lỗi khi load bt6.csv:", err);
    d3.select("#chart8").text("Không thể load dữ liệu bt6.csv");
  });
}

// call it
drawChart8();
