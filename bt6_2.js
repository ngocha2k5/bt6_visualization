function drawChartCau2(containerId, dataFile) {
  const margin = { top: 20, right: 20, bottom: 50, left: 200 };
  const width = 600, height = 400;

  const svg = d3.select(containerId)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

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

  d3.csv(dataFile).then(data => {
    data.forEach(d => d.sales = +d["Thành tiền"].replace(/[^\d]/g,""));

    // Gộp theo mã nhóm hàng
    const grouped = d3.rollups(data, 
      v => d3.sum(v, d => d.sales), 
      d => d["Mã nhóm hàng"]
    );

    const dataset = grouped.map(([code, total]) => {
      const row = data.find(r => r["Mã nhóm hàng"] === code);
      return {
        group: `[${code}] ${row["Tên nhóm hàng"]}`,
        sales: total
      };
    });

    // Sắp xếp giảm dần
    dataset.sort((a,b)=>b.sales - a.sales);

    const x = d3.scaleLinear().domain([0, d3.max(dataset,d=>d.sales)]).nice().range([0,width]);
    const y = d3.scaleBand().domain(dataset.map(d=>d.group)).range([0,height]).padding(0.2);
    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(dataset.map(d=>d.group));

    // Vẽ trục
    svg.append("g").call(d3.axisLeft(y));
    svg.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x).ticks(5).tickFormat(d=>d/1e6+"M"));

    // Vẽ cột ngang
    svg.selectAll("rect").data(dataset).enter().append("rect")
      .attr("y", d=>y(d.group))
      .attr("x",0)
      .attr("height", y.bandwidth())
      .attr("width", d=>x(d.sales))
      .attr("fill", d=>color(d.group))
      .on("mouseover", (event,d)=>{
        tooltip.style("display","block")
          .html(`Nhóm hàng: ${d.group}<br/>Doanh số bán: ${formatNumber(d.sales)}`);
      })
      .on("mousemove", (event)=>{
        tooltip.style("top",(event.pageY-30)+"px").style("left",(event.pageX+10)+"px");
      })
      .on("mouseout",()=>tooltip.style("display","none"));

    // Label doanh thu
    svg.selectAll(".label").data(dataset).enter().append("text")
      .attr("x", d=>x(d.sales)+5)
      .attr("y", d=>y(d.group)+y.bandwidth()/2)
      .attr("dy",".35em")
      .text(d=>(d.sales/1e6).toFixed(0)+" triệu VND")
      .style("font-size","12px");
  });
}

// Gọi hàm cho chart2
drawChartCau2("#chart2", "bt6.csv");
