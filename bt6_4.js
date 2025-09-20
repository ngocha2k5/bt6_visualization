function drawChart4() {
  d3.csv("bt6.csv").then(data => {
    // --- Helpers ---
    const parse1 = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const parse2 = d3.timeParse("%Y-%m-%d %H:%M");
    const parse3 = d3.timeParse("%Y-%m-%d");
    const parse4 = d3.timeParse("%d/%m/%Y %H:%M:%S");
    const parse5 = d3.timeParse("%d/%m/%Y %H:%M");
    const parse6 = d3.timeParse("%d/%m/%Y");

    function tryParseDate(s) {
      if (!s && s !== 0) return null;
      // try native
      let d = new Date(s);
      if (!isNaN(d)) return d;
      // try d3 parsers
      const parsers = [parse1, parse2, parse3, parse4, parse5, parse6];
      for (let p of parsers) {
        const dd = p(s);
        if (dd) return dd;
      }
      return null;
    }

    function toNumberMoney(str) {
      if (str === undefined || str === null) return NaN;
      return +String(str).replace(/[^\d.-]/g, "");
    }

    // --- Clean data & check columns ---
    if (!data || data.length === 0) {
      console.error("CSV rỗng hoặc không load được.");
      return;
    }
    // Column names used in your project: "Thành tiền" và "Thời gian tạo đơn"
    if (!(data[0].hasOwnProperty("Thành tiền"))) {
      console.error("CSV thiếu cột 'Thành tiền'. Kiểm tra header.");
      return;
    }
    // try multiple possible time column names
    const possibleDateCols = ["Thời gian tạo đơn", "Ngày", "Thời gian", "Created At", "created_at"];
    let dateCol = possibleDateCols.find(c => data[0].hasOwnProperty(c));
    if (!dateCol) {
      console.error("Không tìm cột ngày. Các tên thử: ", possibleDateCols);
      return;
    }

    // parse rows
    const rows = data.map((d, i) => {
      const sales = toNumberMoney(d["Thành tiền"]);
      const date = tryParseDate(d[dateCol]);
      return { __rawIndex: i, sales, date, rawDateValue: d[dateCol] };
    });

    // report parsing problems
    const badDates = rows.filter(r => !r.date);
    const badSales = rows.filter(r => isNaN(r.sales));
    if (badDates.length) console.warn(`Có ${badDates.length} hàng không parse được ngày (ví dụ hàng 0):`, badDates.slice(0,3));
    if (badSales.length) console.warn(`Có ${badSales.length} hàng có 'Thành tiền' không hợp lệ (ví dụ hàng 0):`, badSales.slice(0,3));

    // keep only good rows
    const goodRows = rows.filter(r => r.date && !isNaN(r.sales));

    if (goodRows.length === 0) {
      console.error("Không có hàng hợp lệ để vẽ.");
      return;
    }

    // add weekday and dateKey
    const fmtDate = d3.timeFormat("%Y-%m-%d");
    goodRows.forEach(r => {
      r.weekday = r.date.getDay(); // 0=Chủ Nhật .. 6=Thứ Bảy
      r.dateKey = fmtDate(r.date); // group by date string
    });

    const weekdayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const order = ["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ Nhật"];

    // -------- Method A: avg per order (mean of orders belonging to weekday) --------
    const rollOrder = d3.rollups(
      goodRows,
      v => d3.mean(v, d => d.sales),
      d => d.weekday
    );
    const avgPerOrder = rollOrder.map(([w, val]) => ({ weekdayIndex: +w, weekday: weekdayNames[w], value: val }));

    // -------- Method B: avg per day (for each calendar date sum then average across dates of same weekday) --------
    // 1) sum by dateKey
    const sumByDate = d3.rollups(
      goodRows,
      v => d3.sum(v, d => d.sales),
      d => d.dateKey,
      d => d.weekday // keep weekday for dateKey
    ); // result: [ [dateKey, [[weekday, total]]] ] - we'll simplify
    // convert to [{dateKey, weekday, total}]
    const daily = [];
    sumByDate.forEach(([dateKey, arr]) => {
      // arr like [[weekdayIndex, total]]
      const w = arr[0] ? arr[0][0] : null;
      const total = arr[0] ? arr[0][1] : 0;
      if (w !== null) daily.push({ dateKey, weekdayIndex: +w, total });
    });

    // 2) group daily totals by weekday and take mean of totals
    const rollDaily = d3.rollups(
      daily,
      v => d3.mean(v, d => d.total),
      d => d.weekdayIndex
    );
    const avgPerDay = rollDaily.map(([w, val]) => ({ weekdayIndex: +w, weekday: weekdayNames[w], value: val }));

    // Prepare arrays sorted in your requested order (Thứ Hai .. Chủ Nhật)
    function sortAndFill(arr) {
      // map by name for quick lookup
      const map = new Map(arr.map(d => [d.weekday, d.value]));
      const out = order.map(name => ({ weekday: name, value: map.has(name) ? map.get(name) : 0 }));
      return out;
    }

    const avgPerOrderSorted = sortAndFill(avgPerOrder);
    const avgPerDaySorted = sortAndFill(avgPerDay);

    // Log both to console for you to compare with file
    console.log(">> avgPerOrder (mean per order) :"); console.table(avgPerOrderSorted);
    console.log(">> avgPerDay (mean of daily totals) :"); console.table(avgPerDaySorted);

    // We'll use avgPerDaySorted for chart (comment change if you prefer avgPerOrder)
    const chartData = avgPerDaySorted;

    // --- draw chart (format giống chart3) ---
    const margin = {top: 20, right: 20, bottom: 50, left: 100};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select("#chart4").select("svg").remove();
    d3.selectAll(".tooltip-chart4").remove();

    const svg = d3.select("#chart4")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(chartData.map(d => d.weekday))
      .range([0, width])
      .padding(0.4);

    const y = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.value) || 0])
      .nice()
      .range([height, 0]);

    const color = d3.scaleOrdinal()
      .domain(chartData.map(d => d.weekday))
      .range(d3.schemeTableau10);

    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip-chart4")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "6px")
      .style("font-size", "12px")
      .style("border-radius", "5px")
      .style("display", "none")
      .style("pointer-events", "none");

    const formatNumber = d3.format(",");

    // axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d >= 1e6 ? (d/1e6) + "M" : d));

    // bars
    svg.selectAll(".bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class","bar")
      .attr("x", d => x(d.weekday))
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.value))
      .attr("fill", d => color(d.weekday))
      .on("mouseover", (event, d) => {
        tooltip.style("display","block")
          .html(`<b>Ngày trong tuần:</b> ${d.weekday}<br/><b>Doanh số bán TB:</b> ${formatNumber(Math.round(d.value))} VND`);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", (event.pageY - 30) + "px").style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", () => tooltip.style("display","none"));

    // labels
    svg.selectAll(".label")
      .data(chartData)
      .enter()
      .append("text")
      .attr("x", d => x(d.weekday) + x.bandwidth()/2)
      .attr("y", d => y(d.value) - 5)
      .attr("text-anchor", "middle")
      .style("font-size","10px")
      .style("fill","black")
      .text(d => formatNumber(Math.round(d.value)) + " VND");
  }).catch(err => {
    console.error("Lỗi load bt6.csv:", err);
  });
}

drawChart4();
