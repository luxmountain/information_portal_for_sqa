/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 100.0, "KoPercent": 0.0};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9990484648566353, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "TJ-X03 - GET /api/news (TC095)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L04 - GET /api/events (TC097)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L03 - GET /api/news (TC095)"], "isController": false}, {"data": [0.9985, 500, 1500, "TJ-X02 - GET /api/home"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S01 - GET /api/health"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S08 - GET /api/banners"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X01 - GET /api/health"], "isController": false}, {"data": [0.996, 500, 1500, "TJ-L12 - DELETE /api/news Delete (TC141)"], "isController": false}, {"data": [0.996, 500, 1500, "TJ-L10 - POST /api/news Create (TC138)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X08 - POST /api/auth/login"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S06 - GET /api/departments (TC104)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X05 - GET /api/recruitment (TC101)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S07 - GET /api/majors (TC113)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L06 - GET /api/departments (TC104)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L07 - GET /api/majors (TC113)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X04 - GET /api/events (TC097)"], "isController": false}, {"data": [0.999, 500, 1500, "TJ-L11 - PUT /api/news Update (TC140)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S12 - POST /api/news Create (TC138)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L08 - GET /api/news Pagination (TC127)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S13 - PUT /api/news Update (TC140)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L09 - POST /api/auth/login"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S04 - GET /api/events (TC097)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S09 - GET /api/enterprises"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L01 - GET /api/health"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X06 - GET /api/departments (TC104)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X07 - GET /api/news Pagination (TC127)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S03 - GET /api/news (TC095)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S05 - GET /api/recruitment (TC101)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L02 - GET /api/home"], "isController": false}, {"data": [0.999, 500, 1500, "TJ-X11 - DELETE /api/news Delete (TC141)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S10 - GET /api/news Pagination (TC127)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L05 - GET /api/recruitment (TC101)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S14 - DELETE /api/news Delete (TC141)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S11 - POST /api/auth/login"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S02 - GET /api/home"], "isController": false}, {"data": [0.9965, 500, 1500, "TJ-X09 - POST /api/news Create (TC138)"], "isController": false}, {"data": [0.9955, 500, 1500, "TJ-X10 - PUT /api/news Update (TC140)"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 15764, 0, 0.0, 21.576947475260077, 0, 1200, 5.0, 77.0, 92.0, 167.0, 376.82268011665155, 234.2002953638189, 99.83662642079409], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["TJ-X03 - GET /api/news (TC095)", 1000, 0, 0.0, 9.557999999999996, 1, 355, 2.0, 13.899999999999977, 77.94999999999993, 91.99000000000001, 32.298698362455994, 25.84870507452925, 5.8352140596233975], "isController": false}, {"data": ["TJ-L04 - GET /api/events (TC097)", 500, 0, 0.0, 6.6160000000000005, 1, 138, 4.0, 8.0, 12.949999999999989, 70.0, 47.587322737222806, 12.408022627771961, 8.69026303892643], "isController": false}, {"data": ["TJ-L03 - GET /api/news (TC095)", 500, 0, 0.0, 7.020000000000002, 1, 90, 4.0, 9.0, 14.899999999999977, 71.0, 47.57826624797792, 44.29889707631554, 8.595682867066325], "isController": false}, {"data": ["TJ-X02 - GET /api/home", 1000, 0, 0.0, 24.39999999999997, 2, 838, 4.0, 86.0, 103.94999999999993, 249.87000000000012, 32.29348317509526, 26.390871490102047, 5.83427186268811], "isController": false}, {"data": ["TJ-S01 - GET /api/health", 1, 0, 0.0, 31.0, 31, 31, 31.0, 31.0, 31.0, 31.0, 32.25806451612903, 10.112147177419354, 5.890877016129032], "isController": false}, {"data": ["TJ-S08 - GET /api/banners", 1, 0, 0.0, 2.0, 2, 2, 2.0, 2.0, 2.0, 2.0, 500.0, 130.37109375, 91.796875], "isController": false}, {"data": ["TJ-X01 - GET /api/health", 1000, 0, 0.0, 3.210999999999996, 0, 265, 1.0, 2.0, 3.0, 82.0, 32.29661208539225, 10.124230936924716, 5.897916464812841], "isController": false}, {"data": ["TJ-L12 - DELETE /api/news Delete (TC141)", 500, 0, 0.0, 39.62000000000003, 9, 750, 21.0, 76.0, 100.89999999999998, 367.73000000000025, 47.901896915117845, 13.940200469438588, 20.06827517244683], "isController": false}, {"data": ["TJ-L10 - POST /api/news Create (TC138)", 500, 0, 0.0, 49.175999999999995, 9, 645, 25.0, 90.90000000000003, 139.89999999999998, 465.97, 47.88813332056316, 21.31676653337803, 24.54360364189254], "isController": false}, {"data": ["TJ-X08 - POST /api/auth/login", 200, 0, 0.0, 81.60500000000002, 58, 351, 77.0, 86.0, 93.0, 351.0, 6.688739507039899, 3.7232241396608807, 1.7113767098090364], "isController": false}, {"data": ["TJ-S06 - GET /api/departments (TC104)", 1, 0, 0.0, 5.0, 5, 5, 5.0, 5.0, 5.0, 5.0, 200.0, 325.5859375, 37.5], "isController": false}, {"data": ["TJ-X05 - GET /api/recruitment (TC101)", 1000, 0, 0.0, 4.4090000000000025, 0, 107, 1.0, 6.0, 14.0, 85.0, 32.29974160206718, 8.421905281007751, 6.0562015503875966], "isController": false}, {"data": ["TJ-S07 - GET /api/majors (TC113)", 1, 0, 0.0, 3.0, 3, 3, 3.0, 3.0, 3.0, 3.0, 333.3333333333333, 236.328125, 60.87239583333333], "isController": false}, {"data": ["TJ-L06 - GET /api/departments (TC104)", 500, 0, 0.0, 11.848000000000006, 2, 142, 6.0, 17.900000000000034, 70.0, 94.0, 47.60544606302961, 77.4983189326859, 8.926021136818052], "isController": false}, {"data": ["TJ-L07 - GET /api/majors (TC113)", 500, 0, 0.0, 4.059999999999998, 0, 87, 2.0, 5.0, 6.0, 70.94000000000005, 47.62358319839985, 33.76437636917802, 8.696884822364034], "isController": false}, {"data": ["TJ-X04 - GET /api/events (TC097)", 1000, 0, 0.0, 8.3, 1, 142, 2.0, 12.0, 72.94999999999993, 93.0, 32.29765519023319, 8.42136126542213, 5.898106953685162], "isController": false}, {"data": ["TJ-L11 - PUT /api/news Update (TC140)", 500, 0, 0.0, 43.34599999999997, 10, 759, 26.0, 85.0, 109.0, 302.8000000000002, 47.906486538277285, 20.295695302768998, 21.231368867969724], "isController": false}, {"data": ["TJ-S12 - POST /api/news Create (TC138)", 1, 0, 0.0, 15.0, 15, 15, 15.0, 15.0, 15.0, 15.0, 66.66666666666667, 29.296875, 33.723958333333336], "isController": false}, {"data": ["TJ-L08 - GET /api/news Pagination (TC127)", 500, 0, 0.0, 14.769999999999992, 3, 251, 6.0, 66.80000000000007, 74.0, 98.97000000000003, 47.62358319839985, 45.44489728188399, 9.347988498904657], "isController": false}, {"data": ["TJ-S13 - PUT /api/news Update (TC140)", 1, 0, 0.0, 15.0, 15, 15, 15.0, 15.0, 15.0, 15.0, 66.66666666666667, 28.190104166666668, 29.817708333333336], "isController": false}, {"data": ["TJ-L09 - POST /api/auth/login", 50, 0, 0.0, 68.51999999999997, 62, 126, 66.0, 80.8, 86.89999999999999, 126.0, 5.08078447312265, 2.828171044609288, 1.2999663398028656], "isController": false}, {"data": ["TJ-S04 - GET /api/events (TC097)", 1, 0, 0.0, 5.0, 5, 5, 5.0, 5.0, 5.0, 5.0, 200.0, 52.1484375, 36.5234375], "isController": false}, {"data": ["TJ-S09 - GET /api/enterprises", 1, 0, 0.0, 2.0, 2, 2, 2.0, 2.0, 2.0, 2.0, 500.0, 130.37109375, 93.75], "isController": false}, {"data": ["TJ-L01 - GET /api/health", 500, 0, 0.0, 2.408000000000002, 0, 72, 1.0, 2.0, 3.0, 63.99000000000001, 47.564687975646876, 14.910414882990867, 8.686129542427702], "isController": false}, {"data": ["TJ-X06 - GET /api/departments (TC104)", 1000, 0, 0.0, 14.40600000000002, 2, 358, 3.0, 47.89999999999998, 95.0, 124.99000000000001, 32.298698362455994, 52.58000993184975, 6.056005942960499], "isController": false}, {"data": ["TJ-X07 - GET /api/news Pagination (TC127)", 1000, 0, 0.0, 11.751999999999999, 2, 171, 4.0, 27.0, 82.0, 104.99000000000001, 32.29974160206718, 27.69573517239987, 6.3400859980620154], "isController": false}, {"data": ["TJ-S03 - GET /api/news (TC095)", 1, 0, 0.0, 6.0, 6, 6, 6.0, 6.0, 6.0, 6.0, 166.66666666666666, 43.45703125, 30.110677083333332], "isController": false}, {"data": ["TJ-S05 - GET /api/recruitment (TC101)", 1, 0, 0.0, 3.0, 3, 3, 3.0, 3.0, 3.0, 3.0, 333.3333333333333, 86.9140625, 62.5], "isController": false}, {"data": ["TJ-L02 - GET /api/home", 500, 0, 0.0, 17.36799999999999, 3, 252, 10.0, 30.0, 75.0, 165.83000000000015, 47.55564009891573, 41.162285851008185, 8.591595135058018], "isController": false}, {"data": ["TJ-X11 - DELETE /api/news Delete (TC141)", 1000, 0, 0.0, 37.287999999999975, 7, 753, 17.0, 89.89999999999998, 97.0, 151.99, 32.346757237586935, 9.413411774219634, 13.551522319262494], "isController": false}, {"data": ["TJ-S10 - GET /api/news Pagination (TC127)", 1, 0, 0.0, 5.0, 5, 5, 5.0, 5.0, 5.0, 5.0, 200.0, 66.015625, 39.2578125], "isController": false}, {"data": ["TJ-L05 - GET /api/recruitment (TC101)", 500, 0, 0.0, 4.617999999999999, 0, 81, 2.0, 6.0, 9.0, 69.0, 47.6009139375476, 12.4115664270754, 8.925171363290175], "isController": false}, {"data": ["TJ-S14 - DELETE /api/news Delete (TC141)", 1, 0, 0.0, 12.0, 12, 12, 12.0, 12.0, 12.0, 12.0, 83.33333333333333, 24.251302083333332, 34.912109375], "isController": false}, {"data": ["TJ-S11 - POST /api/auth/login", 1, 0, 0.0, 69.0, 69, 69, 69.0, 69.0, 69.0, 69.0, 14.492753623188406, 8.067255434782608, 3.7081068840579707], "isController": false}, {"data": ["TJ-S02 - GET /api/home", 1, 0, 0.0, 9.0, 9, 9, 9.0, 9.0, 9.0, 9.0, 111.1111111111111, 50.23871527777778, 20.073784722222225], "isController": false}, {"data": ["TJ-X09 - POST /api/news Create (TC138)", 1000, 0, 0.0, 51.29300000000009, 8, 1185, 20.0, 103.0, 136.94999999999993, 472.0, 32.34989648033127, 14.60989563114648, 16.789722640075052], "isController": false}, {"data": ["TJ-X10 - PUT /api/news Update (TC140)", 1000, 0, 0.0, 55.16799999999998, 7, 1200, 21.0, 103.0, 129.89999999999986, 487.98, 32.346757237586935, 13.913528020378457, 14.418946102215754], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": []}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 15764, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
