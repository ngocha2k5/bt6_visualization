function drawChart7() {
  d3.csv("bt6.csv").then(function(raw) {
    // Chuẩn bị dữ liệu
    const rows = raw.map(r => {
      return {
        nhom: r["Mã nhóm hàng"],
        ten: r["Tên nhóm hàng"],
        madon: r["Mã đơn hàng"]
      };
    }).filter(r => r.nhom && r.ten && r.madon);

    // Tổng số đơn hàng
    const totalOrders = d3.rollup(rows, v => v.length, d => d.madon).size;

    // Xác suất bán theo nhóm hàng = số đơn có nhóm đó / tổng số đơn
    const ordersByGroup = d3.rollup(
      rows,
      v => new Set(v.map(d => d.madon)).size,
      d => `[${d.nhom}] ${d.ten}`
    );

    let data = Array.from(ordersByGroup, ([group, count]) => {
      const prob = totalOrders > 0 ? count / totalOrders : 0;
      return { group: group, value: prob };
    });

    // Sắp xếp giảm dần
    data.sort((a, b) => d3.descending(a.value, b.value));

    // --- chart setup ---
    const margin = { top: 20, right: 40, bottom: 40, left: 160 },
          width = 900 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

    d3.select("#chart7").selectAll("*").remove();
    d3.selectAll(".chart-tooltip").remove();

    const svg = d3.select("#chart7")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand()
      .domain(data.map(d => d.group))
      .range([0, height])
      .padding(0.2);

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .nice()
      .range([0, width]);

    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.group))
      .range(d3.schemeTableau10);

    // tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "chart-tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "8px 10px")
      .style("border-radius", "6px")
      .style("box-shadow", "0 2px 6px rgba(0,0,0,0.15)")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Y axis (nhóm hàng)
    svg.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll("text")
      .style("font-size", "11px");

    // X axis hidden
    const gX = svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(0).tickSize(0));
    gX.selectAll("*").remove();

    // Bars
    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("y", d => y(d.group))
      .attr("x", 0)
      .attr("height", y.bandwidth())
      .attr("width", d => x(d.value))
      .attr("fill", d => color(d.group))
      .on("mouseover", function(event, d) {
        tooltip.transition().duration(100).style("opacity", 1);
        tooltip.html(
          `<div><b>Nhóm hàng</b>: ${d.group}</div>
           <div><b>Xác suất Bán</b>: ${(d.value*100).toFixed(0)}%</div>`
        )
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 10) + "px");
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 12) + "px")
               .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition().duration(100).style("opacity", 0);
      });

    // Label trong cột: xx.x %
    svg.selectAll("text.label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", d => x(d.value) - 5)  // sát bên phải thanh
      .attr("y", d => y(d.group) + y.bandwidth()/2)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .style("font-size", "10px")
      .style("fill", "white")
      .text(d => (d.value*100).toFixed(1) + " %");
  }).catch(err => {
    console.error("Lỗi khi load bt6.csv:", err);
    d3.select("#chart7").text("Không thể load dữ liệu bt6.csv");
  });
}

// gọi render
drawChart7();
