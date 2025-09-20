// bt6_6.js — tính trung bình theo "những ngày có doanh số" cho mỗi khung giờ
function drawChart6() {
  d3.csv("bt6.csv").then(function(raw) {
    const rows = raw.map(r => {
      return {
        dt: new Date(r["Thời gian tạo đơn"]),
        thanhtien: +(r["Thành tiền"] || 0)
      };
    }).filter(r => r.dt && !isNaN(r.dt));

    if (rows.length === 0) {
      d3.select("#chart6").text("Không có dữ liệu");
      return;
    }

    // tổng theo (date, hour)
    const totalsByDateHour = new Map();
    const dateSet = new Set();
    rows.forEach(r => {
      const dateStr = r.dt.toISOString().slice(0,10); // yyyy-mm-dd
      const hour = r.dt.getHours();
      dateSet.add(dateStr);
      const key = `${dateStr}|${hour}`;
      totalsByDateHour.set(key, (totalsByDateHour.get(key) || 0) + r.thanhtien);
    });
    const uniqueDates = Array.from(dateSet).sort();

    // Tạo mảng cho giờ 0..23: tính totalSum và số ngày có doanh số (countNonZero) -> avg = totalSum / countNonZero
    const allHours = [];
    for (let h = 0; h < 24; h++) {
      let totalSum = 0;
      let countNonZero = 0;
      uniqueDates.forEach(d => {
        const val = totalsByDateHour.get(`${d}|${h}`) || 0;
        totalSum += val;
        if (val > 0) countNonZero++;
      });
      const avgPerActiveDay = countNonZero > 0 ? totalSum / countNonZero : 0;
      const label = String(h).padStart(2, "0") + ":00-" + String(h).padStart(2, "0") + ":59";
      allHours.push({
        hour: h,
        hourLabel: label,
        avgPerActiveDay: avgPerActiveDay,
        totalSum: totalSum,
        countNonZero: countNonZero
      });
    }

    // Hiển thị chỉ các khung giờ hoạt động của báo cáo (08..23) — đổi nếu bạn muốn khác
    const displayHours = allHours.filter(d => d.hour >= 8 && d.hour <= 23);

    // --- setup chart ---
    const margin = { top: 30, right: 20, bottom: 80, left: 40 },
          width = 960 - margin.left - margin.right,
          height = 360 - margin.top - margin.bottom;

    // clear cũ
    d3.select("#chart6").selectAll("*").remove();
    d3.selectAll(".chart-tooltip").remove();

    const svg = d3.select("#chart6")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(displayHours.map(d => d.hourLabel))
      .range([0, width])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, d3.max(displayHours, d => d.avgPerActiveDay) * 1.10])
      .nice()
      .range([height, 0]);

    const color = d3.scaleOrdinal().domain(displayHours.map(d => d.hourLabel))
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

    // X axis (08..23)
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    // Y axis: ẩn
    const gY = svg.append("g").call(d3.axisLeft(y).ticks(0).tickSize(0));
    gY.selectAll("*").remove();

    // Bars
    svg.selectAll("rect")
      .data(displayHours)
      .enter()
      .append("rect")
      .attr("x", d => x(d.hourLabel))
      .attr("y", d => y(d.avgPerActiveDay))
      .attr("width", x.bandwidth())
      .attr("height", d => Math.max(0, height - y(d.avgPerActiveDay)))
      .attr("fill", d => color(d.hourLabel))
      .on("mouseover", function(event, d) {
        tooltip.transition().duration(80).style("opacity", 1);
        // totalSum format with dot thousands
        const totalFormatted = d3.format(",")(Math.round(d.totalSum)).replace(/,/g, ".");
        tooltip.html(
          `<div style="display:flex;justify-content:space-between;width:260px">
             <strong>Khung Giờ</strong><span>${d.hourLabel}</span>
           </div>
           <div style="display:flex;justify-content:space-between;width:260px;margin-top:4px">
             <strong>Doanh số bán TB</strong><span>${totalFormatted}</span>
           </div>`
        )
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 10) + "px");
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition().duration(80).style("opacity", 0);
      });

    // Label trên đỉnh cột: avg trên "những ngày có doanh số" -> hiển thị K với 1 decimal
  // Label trong thanh: avg trên "những ngày có doanh số" -> hiển thị K với 1 decimal
    svg.selectAll("text.label")
    .data(displayHours)
    .enter()
    .append("text")
    .attr("class", "label")
    .filter(d => d.avgPerActiveDay > 0)
    .attr("x", d => x(d.hourLabel) + x.bandwidth() / 2)
    .attr("y", d => y(d.avgPerActiveDay) + 15)  // đẩy xuống một chút để nằm trong cột
    .attr("text-anchor", "middle")
    .style("font-size", "9px")
    .style("fill", "white") // chữ trắng
    .text(d => (d.avgPerActiveDay / 1000).toFixed(1) + " K");
  }).catch(err => {
    console.error("Lỗi khi load bt6.csv:", err);
    d3.select("#chart6").text("Không thể load dữ liệu bt6.csv");
  });
}

// gọi render
drawChart6();
