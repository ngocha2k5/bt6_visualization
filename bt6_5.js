function drawChart5() {
  d3.csv("bt6.csv", function(row) {
    return {
      dt: new Date(row["Thời gian tạo đơn"]),
      thanhtien: +row["Thành tiền"]
    };
  }).then(function(rows) {
    // bỏ dòng không hợp lệ
    rows = rows.filter(r => r.dt && !isNaN(r.dt));

    // 1) Tổng doanh số theo từng ngày (YYYY-MM-DD)
    const totalsByDate = d3.rollup(
      rows,
      v => d3.sum(v, d => d.thanhtien),
      d => d.dt.toISOString().slice(0, 10) // yyyy-mm-dd
    );

    // 2) Gom theo day-of-month → lấy trung bình
    const dailyGroups = d3.group(
      Array.from(totalsByDate, ([date, total]) => {
        const dt = new Date(date);
        return { day: dt.getDate(), total };
      }),
      d => d.day
    );

    const salesByDay = [];
    for (let day = 1; day <= 31; day++) {
      const values = dailyGroups.get(day) || [];
      const avg = values.length ? d3.mean(values, d => d.total) : 0;
      salesByDay.push({
        day,
        dayLabel: "Ngày " + String(day).padStart(2, "0"),
        value: avg
      });
    }

    // --- chart setup ---
    const margin = { top: 30, right: 20, bottom: 80, left: 40 },
          width = 950 - margin.left - margin.right,
          height = 360 - margin.top - margin.bottom;

    d3.select("#chart5").selectAll("*").remove(); // clear cũ

    const svg = d3.select("#chart5")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(salesByDay.map(d => d.dayLabel))
      .range([0, width])
      .padding(0.3); // khoảng cách giữa các thanh

    const y = d3.scaleLinear()
      .domain([0, d3.max(salesByDay, d => d.value) * 1.1])
      .range([height, 0]);

    const color = d3.scaleOrdinal()
      .domain(salesByDay.map(d => d.dayLabel))
      .range(d3.schemeTableau10);

    const tooltip = d3.select("body").append("div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "8px 10px")
      .style("border-radius", "6px")
      .style("box-shadow", "0 2px 6px rgba(0,0,0,0.15)")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Trục X — hiển thị đủ 31 ngày, xoay nhãn cho khỏi chồng
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-60)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    // Trục Y: ẩn hoàn toàn
    const gY = svg.append("g")
      .call(d3.axisLeft(y).ticks(0).tickSize(0));
    gY.selectAll("*").remove();

    // Bars
    svg.selectAll("rect")
      .data(salesByDay)
      .enter()
      .append("rect")
      .attr("x", d => x(d.dayLabel))
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => Math.max(0, height - y(d.value)))
      .attr("fill", d => color(d.dayLabel))
      .on("mouseover", function(event, d) {
        tooltip.transition().duration(100).style("opacity", 1);
        const vRounded = Math.round(d.value);
        const vFormat = d3.format(",")(vRounded).replace(/,/g, ".");
        tooltip.html(
          `<div><b>Ngày trong tháng</b>: ${d.dayLabel}</div>
           <div><b>Doanh số bán TB</b>: ${vFormat}</div>`
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

    // Label trên đỉnh cột
    svg.selectAll("text.label")
      .data(salesByDay)
      .enter()
      .append("text")
      .attr("class", "label")
      .filter(d => d.value > 0)
      .attr("x", d => x(d.dayLabel) + x.bandwidth() / 2)
      .attr("y", d => y(d.value) - 5) // đặt trên đỉnh thanh
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "black")
      .text(d => (d.value / 1e6).toFixed(1) + " tr");
  });
}

drawChart5();


