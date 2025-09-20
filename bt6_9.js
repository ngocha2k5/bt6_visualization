// bt6_9.js — Small multiples (5 groups: 3 on top, 2 on bottom) với căn giữa + x-axis fix
function drawChart9() {
  d3.csv("bt6.csv").then(raw => {
    // Gom đơn hàng
    const orders = new Map();
    raw.forEach(r => {
      const orderId = r["Mã đơn hàng"];
      if (!orderId) return;
      const group = `[${(r["Mã nhóm hàng"]||"").trim()}] ${ (r["Tên nhóm hàng"]||"").trim() }`;
      const item = `[${(r["Mã mặt hàng"]||"").trim()}] ${ (r["Tên mặt hàng"]||"").trim() }`;

      if (!orders.has(orderId)) {
        orders.set(orderId, { groups: new Map() });
      }
      const entry = orders.get(orderId);
      if (!entry.groups.has(group)) {
        entry.groups.set(group, new Set());
      }
      entry.groups.get(group).add(item);
    });

    // Tính toán P(item|group)
    const results = [];
    const groupTotals = new Map();
    orders.forEach(order => {
      order.groups.forEach((items, group) => {
        groupTotals.set(group, (groupTotals.get(group) || 0) + 1);
        items.forEach(item => {
          results.push({ group, item });
        });
      });
    });

    const counts = d3.rollup(results, v => v.length, d => d.group, d => d.item);

    const finalData = [];
    counts.forEach((map, group) => {
      map.forEach((cnt, item) => {
        const total = groupTotals.get(group);
        finalData.push({
          group,
          item,
          prob: cnt / total
        });
      });
    });

    const groups = Array.from(new Set(finalData.map(d => d.group)));
    const numCols = 3, numRows = 2;
    const cellW = 280, cellH = 200;
    const margin = { top: 30, right: 60, bottom: 30, left: 100 };

    d3.select("#chart9-container").selectAll("*").remove();

    const totalW = numCols * cellW;
    const totalH = numRows * cellH;

    // svg căn giữa bằng <div style="text-align:center">
    const container = d3.select("#chart9-container")
      .style("display", "flex")
      .style("justify-content", "center");

    const svg = container.append("svg")
      .attr("width", totalW)
      .attr("height", totalH);

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    groups.forEach((group, i) => {
      const row = Math.floor(i / numCols);
      const col = i % numCols;
      const gx = svg.append("g")
        .attr("transform", `translate(${col * cellW},${row * cellH})`);

      const data = finalData.filter(d => d.group === group).sort((a,b) => b.prob - a.prob);

      const innerW = cellW - margin.left - margin.right;
      const innerH = cellH - margin.top - margin.bottom;

      const x = d3.scaleLinear()
        .domain([0, 1])   // luôn 0 → 100%
        .range([0, innerW]);

      const y = d3.scaleBand()
        .domain(data.map(d => d.item))
        .range([0, innerH])
        .padding(0.2);

      const g = gx.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      // Bars
      g.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", d => y(d.item))
        .attr("width", d => x(d.prob))
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.item))
        .on("mouseover", function(event, d) {
          tooltip.transition().duration(80).style("opacity",1);
          tooltip.html(
            `<div>Mặt hàng&nbsp; ${d.item}</div>
             <div>Xác suất bán MH/NH&nbsp; <strong>${(d.prob*100).toFixed(1)}%</strong></div>
             <div>Total&nbsp; <strong>${(d.prob*100).toFixed(1)}%</strong></div>`
          )
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 10) + "px");
        })
        .on("mousemove", function(event) {
          tooltip.style("left",(event.pageX + 12) + "px")
                 .style("top",(event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          tooltip.transition().duration(80).style("opacity",0);
        });

      // Labels ngoài thanh
      g.selectAll("text.label")
        .data(data)
        .enter()
        .append("text")
        .attr("x", d => x(d.prob) + 4)
        .attr("y", d => y(d.item) + y.bandwidth()/2)
        .attr("dy", "0.35em")
        .style("font-size", "9px")
        .text(d => (d.prob*100).toFixed(1) + " %");

      // Axis
      g.append("g").call(d3.axisLeft(y).tickSize(0)).selectAll("text").style("font-size","8px");

      // X axis fix: 0%, 20%, 40%, ..., 100%
      g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickValues([0,0.2,0.4,0.6,0.8,1.0]).tickFormat(d3.format(".0%")));

      // Title
      gx.append("text")
        .attr("x", margin.left)
        .attr("y", 18)
        .style("font-weight","bold")
        .text(group);
    });

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class","chart-tooltip")
      .style("position","absolute")
      .style("background","#fff")
      .style("border","1px solid #ccc")
      .style("padding","6px 10px")
      .style("border-radius","6px")
      .style("box-shadow","0 2px 6px rgba(0,0,0,0.1)")
      .style("opacity",0);
  });
}

// Gọi
drawChart9();
