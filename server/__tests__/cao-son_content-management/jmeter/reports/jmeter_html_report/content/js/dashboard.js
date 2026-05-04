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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9975260086272519, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "TJ-S12 - POST /api/news Create (TC101)"], "isController": false}, {"data": [0.996, 500, 1500, "TJ-X02 - GET /api/home"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S01 - GET /api/health"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S08 - GET /api/banners"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X01 - GET /api/health"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X06 - GET /api/departments (TC119)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S13 - PUT /api/news Update (TC103)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S06 - GET /api/departments (TC119)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S07 - GET /api/majors (TC131)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X08 - POST /api/auth/login"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S04 - GET /api/events (TC107)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X05 - GET /api/recruitment (TC111)"], "isController": false}, {"data": [0.988, 500, 1500, "TJ-X09 - POST /api/news Create (TC101)"], "isController": false}, {"data": [0.9905, 500, 1500, "TJ-X10 - PUT /api/news Update (TC103)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L07 - GET /api/majors (TC131)"], "isController": false}, {"data": [0.993, 500, 1500, "TJ-X11 - DELETE /api/news Delete (TC104)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L03 - GET /api/news (TC105)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S03 - GET /api/news (TC105)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S14 - DELETE /api/news Delete (TC104)"], "isController": false}, {"data": [0.999, 500, 1500, "TJ-L12 - DELETE /api/news Delete (TC104)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L08 - GET /api/news Pagination (TC137)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X04 - GET /api/events (TC107)"], "isController": false}, {"data": [0.993, 500, 1500, "TJ-L11 - PUT /api/news Update (TC103)"], "isController": false}, {"data": [0.999, 500, 1500, "TJ-L10 - POST /api/news Create (TC101)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L09 - POST /api/auth/login"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L04 - GET /api/events (TC107)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S09 - GET /api/enterprises"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S10 - GET /api/news Pagination (TC137)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L01 - GET /api/health"], "isController": false}, {"data": [0.998, 500, 1500, "TJ-X07 - GET /api/news Pagination (TC137)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L02 - GET /api/home"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S05 - GET /api/recruitment (TC111)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L06 - GET /api/departments (TC119)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S11 - POST /api/auth/login"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L05 - GET /api/recruitment (TC111)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X03 - GET /api/news (TC105)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S02 - GET /api/home"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 15764, 0, 0.0, 26.189672671910557, 0, 1579, 8.0, 74.0, 89.0, 305.0, 382.890869786986, 253.89505431614486, 101.4443523277914], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["TJ-S12 - POST /api/news Create (TC101)", 1, 0, 0.0, 17.0, 17, 17, 17.0, 17.0, 17.0, 17.0, 58.8235294117647, 25.85018382352941, 29.75643382352941], "isController": false}, {"data": ["TJ-X02 - GET /api/home", 1000, 0, 0.0, 39.69500000000009, 3, 850, 10.0, 101.0, 124.0, 409.9200000000001, 33.03273544082185, 34.10691225473194, 5.967828180226604], "isController": false}, {"data": ["TJ-S01 - GET /api/health", 1, 0, 0.0, 36.0, 36, 36, 36.0, 36.0, 36.0, 36.0, 27.777777777777775, 8.707682291666668, 5.072699652777779], "isController": false}, {"data": ["TJ-S08 - GET /api/banners", 1, 0, 0.0, 2.0, 2, 2, 2.0, 2.0, 2.0, 2.0, 500.0, 215.33203125, 91.796875], "isController": false}, {"data": ["TJ-X01 - GET /api/health", 1000, 0, 0.0, 4.484000000000007, 0, 154, 1.0, 3.0, 24.899999999999864, 70.99000000000001, 33.037100664045724, 10.356356751131521, 6.033142406422413], "isController": false}, {"data": ["TJ-X06 - GET /api/departments (TC119)", 1000, 0, 0.0, 20.496999999999982, 2, 286, 6.0, 77.0, 88.94999999999993, 139.0, 33.0392837083292, 53.7856308025242, 6.194865695311726], "isController": false}, {"data": ["TJ-S13 - PUT /api/news Update (TC103)", 1, 0, 0.0, 15.0, 15, 15, 15.0, 15.0, 15.0, 15.0, 66.66666666666667, 28.190104166666668, 29.817708333333336], "isController": false}, {"data": ["TJ-S06 - GET /api/departments (TC119)", 1, 0, 0.0, 6.0, 6, 6, 6.0, 6.0, 6.0, 6.0, 166.66666666666666, 271.3216145833333, 31.25], "isController": false}, {"data": ["TJ-S07 - GET /api/majors (TC131)", 1, 0, 0.0, 3.0, 3, 3, 3.0, 3.0, 3.0, 3.0, 333.3333333333333, 236.328125, 60.87239583333333], "isController": false}, {"data": ["TJ-X08 - POST /api/auth/login", 200, 0, 0.0, 77.69999999999999, 60, 304, 66.0, 95.9, 188.89999999999998, 273.8700000000001, 6.6740080755497715, 3.715024026429072, 1.7076075349551174], "isController": false}, {"data": ["TJ-S04 - GET /api/events (TC107)", 1, 0, 0.0, 5.0, 5, 5, 5.0, 5.0, 5.0, 5.0, 200.0, 52.1484375, 36.5234375], "isController": false}, {"data": ["TJ-X05 - GET /api/recruitment (TC111)", 1000, 0, 0.0, 5.532999999999999, 0, 83, 2.0, 8.0, 14.0, 73.99000000000001, 33.04146704113663, 8.615304394515116, 6.195275070213118], "isController": false}, {"data": ["TJ-X09 - POST /api/news Create (TC101)", 1000, 0, 0.0, 69.51899999999996, 9, 1579, 26.0, 107.0, 220.89999999999986, 785.6200000000003, 33.10710147326601, 14.951865378248636, 17.182714989240193], "isController": false}, {"data": ["TJ-X10 - PUT /api/news Update (TC103)", 1000, 0, 0.0, 63.42600000000005, 8, 1245, 27.0, 99.0, 132.49999999999932, 801.4400000000005, 33.10490945807263, 14.239637128811202, 14.756901339093588], "isController": false}, {"data": ["TJ-L07 - GET /api/majors (TC131)", 500, 0, 0.0, 4.852, 0, 118, 2.0, 5.900000000000034, 8.0, 67.99000000000001, 47.564687975646876, 33.72262057648402, 8.686129542427702], "isController": false}, {"data": ["TJ-X11 - DELETE /api/news Delete (TC104)", 1000, 0, 0.0, 48.126000000000026, 7, 1190, 19.0, 79.0, 94.0, 751.830000000002, 33.10490945807263, 9.634045916509418, 13.869146638196444], "isController": false}, {"data": ["TJ-L03 - GET /api/news (TC105)", 500, 0, 0.0, 7.980000000000001, 1, 103, 4.0, 10.0, 20.849999999999966, 74.98000000000002, 47.50593824228029, 40.354438836104514, 8.582615795724465], "isController": false}, {"data": ["TJ-S03 - GET /api/news (TC105)", 1, 0, 0.0, 7.0, 7, 7, 7.0, 7.0, 7.0, 7.0, 142.85714285714286, 37.24888392857143, 25.809151785714285], "isController": false}, {"data": ["TJ-S14 - DELETE /api/news Delete (TC104)", 1, 0, 0.0, 13.0, 13, 13, 13.0, 13.0, 13.0, 13.0, 76.92307692307693, 22.38581730769231, 32.2265625], "isController": false}, {"data": ["TJ-L12 - DELETE /api/news Delete (TC104)", 500, 0, 0.0, 31.43599999999999, 8, 501, 18.0, 68.90000000000003, 77.94999999999999, 480.99, 47.86521156423512, 13.92952445912311, 20.052906016657094], "isController": false}, {"data": ["TJ-L08 - GET /api/news Pagination (TC137)", 500, 0, 0.0, 12.550000000000004, 2, 141, 7.0, 18.0, 70.0, 127.80000000000018, 47.564687975646876, 42.871762628424655, 9.336428010844749], "isController": false}, {"data": ["TJ-X04 - GET /api/events (TC107)", 1000, 0, 0.0, 11.289, 1, 264, 4.0, 18.0, 69.0, 133.0, 33.038192150125546, 8.614450492269063, 6.033341730540505], "isController": false}, {"data": ["TJ-L11 - PUT /api/news Update (TC103)", 500, 0, 0.0, 42.52400000000002, 10, 700, 23.0, 80.0, 108.39999999999986, 536.6600000000003, 47.833157945087535, 20.26462947240027, 21.19887083851526], "isController": false}, {"data": ["TJ-L10 - POST /api/news Create (TC101)", 500, 0, 0.0, 40.87399999999995, 11, 506, 22.0, 82.80000000000007, 111.89999999999998, 466.4700000000005, 47.833157945087535, 21.292294975126758, 24.51542768822348], "isController": false}, {"data": ["TJ-L09 - POST /api/auth/login", 50, 0, 0.0, 73.48000000000003, 60, 305, 65.0, 84.5, 110.19999999999993, 305.0, 5.070479667376533, 2.8224349710982657, 1.2973297586451678], "isController": false}, {"data": ["TJ-L04 - GET /api/events (TC107)", 500, 0, 0.0, 9.095999999999998, 1, 123, 4.0, 12.0, 66.0, 99.82000000000016, 47.523999619808, 12.391511619617907, 8.678699149320407], "isController": false}, {"data": ["TJ-S09 - GET /api/enterprises", 1, 0, 0.0, 3.0, 3, 3, 3.0, 3.0, 3.0, 3.0, 333.3333333333333, 86.9140625, 62.5], "isController": false}, {"data": ["TJ-S10 - GET /api/news Pagination (TC137)", 1, 0, 0.0, 5.0, 5, 5, 5.0, 5.0, 5.0, 5.0, 200.0, 66.015625, 39.2578125], "isController": false}, {"data": ["TJ-L01 - GET /api/health", 500, 0, 0.0, 2.9620000000000015, 0, 76, 1.0, 3.0, 3.9499999999999886, 63.0, 47.48789058790009, 14.886340701871022, 8.672105019470035], "isController": false}, {"data": ["TJ-X07 - GET /api/news Pagination (TC137)", 1000, 0, 0.0, 22.560000000000006, 2, 611, 6.0, 73.0, 83.0, 282.84000000000015, 33.04037533866384, 35.3915981423049, 6.485464299874447], "isController": false}, {"data": ["TJ-L02 - GET /api/home", 500, 0, 0.0, 19.051999999999996, 3, 341, 9.0, 43.600000000000136, 79.0, 119.92000000000007, 47.47887190200361, 48.13699212444212, 8.577725880733073], "isController": false}, {"data": ["TJ-S05 - GET /api/recruitment (TC111)", 1, 0, 0.0, 3.0, 3, 3, 3.0, 3.0, 3.0, 3.0, 333.3333333333333, 86.9140625, 62.5], "isController": false}, {"data": ["TJ-L06 - GET /api/departments (TC119)", 500, 0, 0.0, 14.453999999999995, 2, 187, 6.0, 33.7000000000001, 76.94999999999999, 82.96000000000004, 47.54207473614149, 77.39515486830845, 8.91413901302653], "isController": false}, {"data": ["TJ-S11 - POST /api/auth/login", 1, 0, 0.0, 83.0, 83, 83, 83.0, 83.0, 83.0, 83.0, 12.048192771084338, 6.706513554216867, 3.0826430722891565], "isController": false}, {"data": ["TJ-L05 - GET /api/recruitment (TC111)", 500, 0, 0.0, 4.749999999999993, 0, 104, 2.0, 6.0, 9.0, 68.0, 47.54207473614149, 12.396224564990018, 8.91413901302653], "isController": false}, {"data": ["TJ-X03 - GET /api/news (TC105)", 1000, 0, 0.0, 13.035000000000002, 1, 193, 4.0, 30.899999999999977, 72.0, 87.99000000000001, 33.03600925008259, 33.68534104517674, 5.968419639907499], "isController": false}, {"data": ["TJ-S02 - GET /api/home", 1, 0, 0.0, 13.0, 13, 13, 13.0, 13.0, 13.0, 13.0, 76.92307692307693, 47.70132211538462, 13.897235576923078], "isController": false}]}, function(index, item){
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
