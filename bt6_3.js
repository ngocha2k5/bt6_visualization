function drawChart3() {
  d3.csv("bt6.csv").then(data => {
    // B1: Làm sạch dữ liệu
    data.forEach(d => {
      d.sales = parseInt((d["Thành tiền"] || "0").toString().replace(/[^\d]/g, ""));
      d.date = new Date(d["Thời gian tạo đơn"]);
      d.month = d.date.getMonth() + 1; // tháng 1-12
    });

    // B2: Gộp doanh số theo tháng
    const grouped = d3.rollups(
      data,
      v => d3.sum(v, d => d.sales),
      d => d.month
    );

    // B3: Tạo dataset hiển thị
    const dataset = grouped.map(([m, total]) => ({
      month: "Tháng " + String(m).padStart(2, "0"),
      sales: total
    }));

    dataset.sort((a, b) => a.month.localeCompare(b.month));

    // B4: Kích thước chart
    const margin = {top: 20, right: 20, bottom: 50, left: 80};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Xóa chart cũ trước khi vẽ lại
    d3.select("#chart3").select("svg").remove();

    // B5: Tạo SVG
    const svg = d3.select("#chart3")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // B6: Thang đo
    const x = d3.scaleBand()
      .domain(dataset.map(d => d.month))
      .range([0, width])
      .padding(0.4);

    const y = d3.scaleLinear()
      .domain([0, d3.max(dataset, d => d.sales)])
      .nice()
      .range([height, 0]);

    const color = d3.scaleOrdinal()
      .domain(dataset.map(d => d.month))
      .range(d3.schemeTableau10);

    // B7: Tooltip
    const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "5px 10px")
      .style("font-size", "12px")
      .style("border-radius", "5px")
      .style("display", "none")
      .style("pointer-events", "none");

    const formatNumber = d3.format(",");

    // B8: Vẽ trục
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => (d / 1e6) + "M"));

    // B9: Vẽ cột
    svg.selectAll(".bar")
      .data(dataset)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.month))
      .attr("y", d => y(d.sales))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.sales))
      .attr("fill", d => color(d.month))
      .on("mouseover", (event, d) => {
        tooltip.style("display", "block")
          .html(`Tháng: ${d.month}<br/>Doanh số bán: ${formatNumber(d.sales)}`);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", (event.pageY - 30) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    // B10: Label trên cột
    svg.selectAll(".label")
      .data(dataset)
      .enter()
      .append("text")
      .attr("x", d => x(d.month) + x.bandwidth() / 2)
      .attr("y", d => y(d.sales) - 5)
      .attr("text-anchor", "middle")
      .text(d => (d.sales / 1e6).toFixed(0) + " triệu VND")
      .style("font-size", "8px");
  }).catch(err => {
    console.error("Lỗi load bt6.csv:", err);
  });
}
drawChart3();
