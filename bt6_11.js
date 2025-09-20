// bt6_11.js — Biểu đồ phân phối số lượng mua hàng (Câu 11)
function drawChart11() {
  d3.csv("bt6.csv").then(raw => {
    // Gom số lần mua của từng KH
    const counts = d3.rollup(
      raw,
      v => new Set(v.map(d => d["Mã đơn hàng"])).size,  // số đơn hàng KH đã mua
      d => d["Mã khách hàng"]
    );

    // Đếm tần suất: bao nhiêu KH có số lượng mua = k
    const freq = d3.rollup(
      Array.from(counts.values()),
      v => v.length,
      d => d
    );

    const data = Array.from(freq, ([num, cnt]) => ({ num: +num, cnt }))
      .sort((a,b) => a.num - b.num);

    // Chart setup
    const margin = { top: 30, right: 30, bottom: 50, left: 70 },
          width = 700 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    d3.select("#chart11-container").selectAll("*").remove();

    const svg = d3.select("#chart11-container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.num))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.cnt)]).nice()
      .range([height, 0]);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));
    svg.append("g")
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

    // Bars
    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
        .attr("x", d => x(d.num))
        .attr("y", d => y(d.cnt))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.cnt))
        .attr("fill", "#69b3a2")
        .on("mouseover", function(event, d) {
          tooltip.transition().duration(80).style("opacity",1);
          tooltip.html(
            `<div>Số lượng mua hàng&nbsp; <strong>${d.num}</strong></div>
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
drawChart11();
