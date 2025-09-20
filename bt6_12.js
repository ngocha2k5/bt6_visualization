// bt6_12.js — Biểu đồ phân phối mức chi tiêu (Câu 12)
function drawChart12() {
  d3.csv("bt6.csv").then(raw => {
    // Tổng chi tiêu của từng KH
    const spend = d3.rollup(
      raw,
      v => d3.sum(v, d => +d["Thành tiền"]),
      d => d["Mã khách hàng"]
    );
    const values = Array.from(spend.values());

    // Chia bins theo bước 50,000
    const maxVal = d3.max(values);
    const binGen = d3.bin()
      .domain([0, maxVal])
      .thresholds(d3.range(0, maxVal + 50000, 50000));

    const bins = binGen(values);

    const data = bins.map(b => ({
      range: `Từ ${d3.format(",")(b.x0)} đến ${d3.format(",")(b.x1)}`,
      cnt: b.length,
      x0: b.x0,
      x1: b.x1
    })).filter(d => d.cnt > 0);

    // Chart setup
    const margin = { top: 30, right: 20, bottom: 40, left: 70 },
          width = 800 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    d3.select("#chart12-container").selectAll("*").remove();

    const svg = d3.select("#chart12-container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.range))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.cnt)]).nice()
      .range([height, 0]);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(() => "")); // xoá label trục X

    svg.append("g")
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

    // Bars
    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
        .attr("x", d => x(d.range))
        .attr("y", d => y(d.cnt))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.cnt))
        .attr("fill", "#4682b4")
        .on("mouseover", function(event, d) {
          tooltip.transition().duration(80).style("opacity",1);
          tooltip.html(
            `<div>Mức chi trả&nbsp; <strong>${d.range}</strong></div>
             <div>Số lượng KH&nbsp; <strong>${d3.format(",")(d.cnt)}</strong></div>`
          )
          .style("left",(event.pageX+12)+"px")
          .style("top",(event.pageY-10)+"px");
        })
        .on("mousemove", function(event) {
          tooltip.style("left",(event.pageX+12)+"px").style("top",(event.pageY-10)+"px");
        })
        .on("mouseout", function() {
          tooltip.transition().duration(80).style("opacity",0);
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
drawChart12();
