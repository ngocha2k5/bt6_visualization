const margin = { top: 20, right: 20, bottom: 50, left: 250 };
const legendWidth = 180; // cố định chiều rộng vùng legend
const height = 600 - margin.top - margin.bottom;

// Lấy chiều rộng thực của #chart1 container
const containerWidth = document.getElementById("chart1").clientWidth;
const chartWidth = containerWidth - legendWidth - margin.left - margin.right - 40;

const svg = d3.select("#chart1")
  .append("svg")
  .attr("width", containerWidth)
  .attr("height", height + margin.top + margin.bottom);

// Nhóm chứa cột
const chartGroup = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Nhóm chứa legend bên phải
const legendGroup = svg.append("g")
  .attr("transform", `translate(${margin.left + chartWidth + 40},${margin.top})`);

// Tooltip
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

d3.csv("bt6.csv").then(data => {
  // Làm sạch dữ liệu
  data.forEach(d => {
    let rawValue = d["Thành tiền"].toString().replace(/[^\d]/g, "");
    d.sales = parseInt(rawValue, 10);
  });

  // Gộp theo mã mặt hàng
  const grouped = d3.rollups(
    data,
    v => d3.sum(v, d => d.sales),
    d => d["Mã mặt hàng"]
  );

  const dataset = grouped.map(([maMH, total]) => {
    const row = data.find(d => d["Mã mặt hàng"] === maMH);
    return {
      product: `[${maMH}] ${row["Tên mặt hàng"]}`,
      group: `[${row["Mã nhóm hàng"]}] ${row["Tên nhóm hàng"]}`,
      sales: total
    };
  });

  dataset.sort((a, b) => b.sales - a.sales);

  // Scale
  const x = d3.scaleLinear()
    .domain([0, d3.max(dataset, d => d.sales)])
    .nice()
    .range([0, chartWidth]);

  const y = d3.scaleBand()
    .domain(dataset.map(d => d.product))
    .range([0, height])
    .padding(0.2);

  const color = d3.scaleOrdinal(d3.schemeTableau10)
    .domain([...new Set(dataset.map(d => d.group))]);

  // Trục
  chartGroup.append("g").call(d3.axisLeft(y));
  chartGroup.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => d / 1e6 + "M"));

  // Cột ngang
  chartGroup.selectAll(".bar")
    .data(dataset)
    .enter()
    .append("rect")
    .attr("y", d => y(d.product))
    .attr("x", 0)
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.sales))
    .attr("fill", d => color(d.group))
    .on("mouseover", (event, d) => {
      tooltip.style("display", "block")
        .html(`
          Mặt hàng: ${d.product}<br/>
          Nhóm hàng: ${d.group}<br/>
          Doanh số bán: ${formatNumber(d.sales)}
        `);
    })
    .on("mousemove", (event) => {
      tooltip.style("top", (event.pageY - 30) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", () => tooltip.style("display", "none"));

  // Label
  chartGroup.selectAll(".label")
    .data(dataset)
    .enter()
    .append("text")
    .attr("x", d => x(d.sales) + 5)
    .attr("y", d => y(d.product) + y.bandwidth() / 2)
    .attr("dy", ".35em")
    .text(d => (d.sales / 1e6).toFixed(0) + " triệu VND")
    .style("font-size", "12px");

  // Legend
  const legend = legendGroup.selectAll(".legend")
    .data(color.domain())
    .enter().append("g")
    .attr("class", "legend")
    .attr("transform", (d, i) => `translate(0,${i * 20})`);

  legend.append("rect")
    .attr("width", 15)
    .attr("height", 15)
    .style("fill", color);

  legend.append("text")
    .attr("x", 20)
    .attr("y", 7)
    .attr("dy", "0.35em")
    .text(d => d)
    .style("font-size", "12px");
});
