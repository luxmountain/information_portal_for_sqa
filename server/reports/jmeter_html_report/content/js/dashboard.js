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

    var data = {"OkPercent": 88.00255774918072, "KoPercent": 11.99744225081928};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8800255774918072, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "TJ-X03 - GET /api/news (TC095)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L04 - GET /api/events (TC097)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L03 - GET /api/news (TC095)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X02 - GET /api/home"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S01 - GET /api/health"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S08 - GET /api/banners"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X01 - GET /api/health"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S06 - GET /api/departments (TC104)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X05 - GET /api/recruitment (TC101)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S07 - GET /api/majors (TC113)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L06 - GET /api/departments (TC104)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L07 - GET /api/majors (TC113)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X04 - GET /api/events (TC097)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L08 - GET /api/news Pagination (TC127)"], "isController": false}, {"data": [0.0, 500, 1500, "TJ-X08 - POST /api/news No Token (TC129)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S04 - GET /api/events (TC097)"], "isController": false}, {"data": [0.0, 500, 1500, "TJ-L09 - POST /api/news No Token (TC129)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S09 - GET /api/enterprises"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L01 - GET /api/health"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X06 - GET /api/departments (TC104)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-X07 - GET /api/news Pagination (TC127)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S03 - GET /api/news (TC095)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S05 - GET /api/recruitment (TC101)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L02 - GET /api/home"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S10 - GET /api/news Pagination (TC127)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-L05 - GET /api/recruitment (TC101)"], "isController": false}, {"data": [0.0, 500, 1500, "TJ-S11 - POST /api/news No Token (TC129)"], "isController": false}, {"data": [1.0, 500, 1500, "TJ-S02 - GET /api/home"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 12511, 1501, 11.99744225081928, 2.3630405243385817, 0, 44, 2.0, 5.0, 6.0, 10.0, 312.423523536022, 151.96939088057184, 59.689880134848295], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["TJ-X03 - GET /api/news (TC095)", 1000, 0, 0.0, 2.9160000000000017, 1, 23, 2.0, 5.0, 6.0, 11.990000000000009, 33.460483169376964, 8.724559576390284, 6.045106822592518], "isController": false}, {"data": ["TJ-L04 - GET /api/events (TC097)", 500, 0, 0.0, 2.285999999999997, 1, 11, 2.0, 3.0, 4.0, 6.990000000000009, 50.15045135406219, 13.07633839017051, 9.158334378134402], "isController": false}, {"data": ["TJ-L03 - GET /api/news (TC095)", 500, 0, 0.0, 2.3619999999999997, 1, 10, 2.0, 3.0, 4.0, 5.990000000000009, 50.15045135406219, 13.07633839017051, 9.0603842778335], "isController": false}, {"data": ["TJ-X02 - GET /api/home", 1000, 0, 0.0, 5.084000000000003, 2, 44, 4.0, 7.0, 9.0, 18.0, 33.44705331460299, 15.123032895176935, 6.042680530470266], "isController": false}, {"data": ["TJ-S01 - GET /api/health", 1, 0, 0.0, 34.0, 34, 34, 34.0, 34.0, 34.0, 34.0, 29.41176470588235, 9.219898897058822, 5.37109375], "isController": false}, {"data": ["TJ-S08 - GET /api/banners", 1, 0, 0.0, 3.0, 3, 3, 3.0, 3.0, 3.0, 3.0, 333.3333333333333, 86.9140625, 61.197916666666664], "isController": false}, {"data": ["TJ-X01 - GET /api/health", 1000, 0, 0.0, 0.6139999999999993, 0, 7, 0.0, 2.0, 2.0, 3.0, 33.44705331460299, 10.484867298815974, 6.108006806475349], "isController": false}, {"data": ["TJ-S06 - GET /api/departments (TC104)", 1, 0, 0.0, 10.0, 10, 10, 10.0, 10.0, 10.0, 10.0, 100.0, 162.79296875, 18.75], "isController": false}, {"data": ["TJ-X05 - GET /api/recruitment (TC101)", 1000, 0, 0.0, 1.357, 0, 21, 1.0, 2.0, 3.0, 6.0, 33.473923813349394, 8.728064119301065, 6.276360715003013], "isController": false}, {"data": ["TJ-S07 - GET /api/majors (TC113)", 1, 0, 0.0, 6.0, 6, 6, 6.0, 6.0, 6.0, 6.0, 166.66666666666666, 118.1640625, 30.436197916666664], "isController": false}, {"data": ["TJ-L06 - GET /api/departments (TC104)", 500, 0, 0.0, 2.9499999999999997, 2, 11, 3.0, 4.0, 5.0, 7.0, 50.15045135406219, 81.64140860080241, 9.403209628886659], "isController": false}, {"data": ["TJ-L07 - GET /api/majors (TC113)", 500, 0, 0.0, 1.1339999999999988, 0, 11, 1.0, 2.0, 2.0, 4.0, 50.165546302799235, 35.566588492023676, 9.161090975218219], "isController": false}, {"data": ["TJ-X04 - GET /api/events (TC097)", 1000, 0, 0.0, 2.8369999999999993, 1, 31, 2.0, 5.0, 6.0, 9.0, 33.468322233006454, 8.726603550988989, 6.111890876535359], "isController": false}, {"data": ["TJ-L08 - GET /api/news Pagination (TC127)", 500, 0, 0.0, 2.881999999999999, 1, 11, 3.0, 4.0, 5.0, 7.990000000000009, 50.15548199418196, 16.555227455110845, 9.84497253987361], "isController": false}, {"data": ["TJ-X08 - POST /api/news No Token (TC129)", 1000, 1000, 100.0, 0.6500000000000002, 0, 21, 1.0, 1.0, 2.0, 4.0, 33.487375259527155, 10.432102253700355, 7.815901061549797], "isController": false}, {"data": ["TJ-S04 - GET /api/events (TC097)", 1, 0, 0.0, 5.0, 5, 5, 5.0, 5.0, 5.0, 5.0, 200.0, 52.1484375, 36.5234375], "isController": false}, {"data": ["TJ-L09 - POST /api/news No Token (TC129)", 500, 500, 100.0, 0.5339999999999994, 0, 3, 1.0, 1.0, 1.0, 2.0, 50.175614651279474, 15.630879954841948, 11.710910060210738], "isController": false}, {"data": ["TJ-S09 - GET /api/enterprises", 1, 0, 0.0, 3.0, 3, 3, 3.0, 3.0, 3.0, 3.0, 333.3333333333333, 86.9140625, 62.5], "isController": false}, {"data": ["TJ-L01 - GET /api/health", 500, 0, 0.0, 0.4140000000000003, 0, 3, 0.0, 1.0, 1.0, 2.0, 50.13536548681439, 15.716262032487716, 9.155579439486614], "isController": false}, {"data": ["TJ-X06 - GET /api/departments (TC104)", 1000, 0, 0.0, 3.618999999999994, 1, 29, 3.0, 5.0, 7.0, 14.0, 33.47616497054098, 54.49684277919122, 6.2767809319764325], "isController": false}, {"data": ["TJ-X07 - GET /api/news Pagination (TC127)", 1000, 0, 0.0, 3.562000000000001, 1, 24, 3.0, 6.0, 7.0, 12.990000000000009, 33.48064818534887, 11.051229576804607, 6.571885044194456], "isController": false}, {"data": ["TJ-S03 - GET /api/news (TC095)", 1, 0, 0.0, 7.0, 7, 7, 7.0, 7.0, 7.0, 7.0, 142.85714285714286, 37.24888392857143, 25.809151785714285], "isController": false}, {"data": ["TJ-S05 - GET /api/recruitment (TC101)", 1, 0, 0.0, 3.0, 3, 3, 3.0, 3.0, 3.0, 3.0, 333.3333333333333, 86.9140625, 62.5], "isController": false}, {"data": ["TJ-L02 - GET /api/home", 500, 0, 0.0, 3.985999999999997, 2, 14, 4.0, 6.0, 6.0, 8.0, 50.130338881090836, 22.66635439643072, 9.056750676759576], "isController": false}, {"data": ["TJ-S10 - GET /api/news Pagination (TC127)", 1, 0, 0.0, 5.0, 5, 5, 5.0, 5.0, 5.0, 5.0, 200.0, 66.015625, 39.2578125], "isController": false}, {"data": ["TJ-L05 - GET /api/recruitment (TC101)", 500, 0, 0.0, 1.074, 0, 13, 1.0, 2.0, 2.0, 3.0, 50.165546302799235, 13.08027428012441, 9.406039931774856], "isController": false}, {"data": ["TJ-S11 - POST /api/news No Token (TC129)", 1, 1, 100.0, 17.0, 17, 17, 17.0, 17.0, 17.0, 17.0, 58.8235294117647, 18.324908088235293, 14.47610294117647], "isController": false}, {"data": ["TJ-S02 - GET /api/home", 1, 0, 0.0, 21.0, 21, 21, 21.0, 21.0, 21.0, 21.0, 47.61904761904761, 21.530877976190474, 8.603050595238095], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["401/Unauthorized", 1501, 100.0, 11.99744225081928], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 12511, 1501, "401/Unauthorized", 1501, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["TJ-X08 - POST /api/news No Token (TC129)", 1000, 1000, "401/Unauthorized", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["TJ-L09 - POST /api/news No Token (TC129)", 500, 500, "401/Unauthorized", 500, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["TJ-S11 - POST /api/news No Token (TC129)", 1, 1, "401/Unauthorized", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
