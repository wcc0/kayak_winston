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

    var data = {"OkPercent": 50.0, "KoPercent": 50.0};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.5, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "Invalid Token - SHOULD FAIL 401"], "isController": false}, {"data": [0.0, 500, 1500, "Invalid Route - SHOULD FAIL 404"], "isController": false}, {"data": [0.0, 500, 1500, "No Token Access - SHOULD FAIL 401"], "isController": false}, {"data": [1.0, 500, 1500, "Health Check - SHOULD PASS"], "isController": false}, {"data": [1.0, 500, 1500, "Valid Users List - SHOULD PASS"], "isController": false}, {"data": [0.0, 500, 1500, "Invalid Login - SHOULD FAIL 401"], "isController": false}, {"data": [1.0, 500, 1500, "Valid Billing - SHOULD PASS"], "isController": false}, {"data": [1.0, 500, 1500, "Valid Login - SHOULD PASS"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 800, 400, 50.0, 8.198750000000002, 0, 87, 1.0, 57.0, 58.0, 78.0, 81.74943797261395, 219.71039622930718, 20.626963902513797], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Invalid Token - SHOULD FAIL 401", 100, 100, 100.0, 0.31999999999999984, 0, 1, 0.0, 1.0, 1.0, 1.0, 10.334849111202976, 10.082533459073998, 1.7460243127325341], "isController": false}, {"data": ["Invalid Route - SHOULD FAIL 404", 100, 100, 100.0, 0.27000000000000013, 0, 1, 0.0, 1.0, 1.0, 1.0, 10.332713370531101, 10.070359320107459, 4.005944539160983], "isController": false}, {"data": ["No Token Access - SHOULD FAIL 401", 100, 100, 100.0, 0.29, 0, 1, 0.0, 1.0, 1.0, 1.0, 10.32844453625284, 10.378876394340011, 1.3213146818839083], "isController": false}, {"data": ["Health Check - SHOULD PASS", 100, 0, 0.0, 0.22000000000000006, 0, 2, 0.0, 1.0, 1.0, 1.9899999999999949, 10.346611484738748, 10.6800472064149, 1.2327017589239526], "isController": false}, {"data": ["Valid Users List - SHOULD PASS", 100, 0, 0.0, 0.89, 0, 4, 1.0, 1.0, 1.0, 3.9799999999999898, 10.32844453625284, 32.81096687151415, 3.852993957859946], "isController": false}, {"data": ["Invalid Login - SHOULD FAIL 401", 100, 100, 100.0, 0.9099999999999998, 0, 2, 1.0, 1.0, 1.0, 2.0, 10.325245224574083, 10.194163009808982, 2.4098961022199274], "isController": false}, {"data": ["Valid Billing - SHOULD PASS", 100, 0, 0.0, 0.92, 0, 11, 1.0, 1.0, 1.9499999999999886, 10.919999999999959, 10.334849111202976, 121.72595209797437, 3.875568416701116], "isController": false}, {"data": ["Valid Login - SHOULD PASS", 100, 0, 0.0, 61.769999999999996, 56, 87, 58.0, 78.0, 80.0, 86.93999999999997, 10.221813349688235, 16.06142351528161, 2.3857552642338753], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["401/Unauthorized", 300, 75.0, 37.5], "isController": false}, {"data": ["404/Not Found", 100, 25.0, 12.5], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 800, 400, "401/Unauthorized", 300, "404/Not Found", 100, "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["Invalid Token - SHOULD FAIL 401", 100, 100, "401/Unauthorized", 100, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["Invalid Route - SHOULD FAIL 404", 100, 100, "404/Not Found", 100, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["No Token Access - SHOULD FAIL 401", 100, 100, "401/Unauthorized", 100, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Invalid Login - SHOULD FAIL 401", 100, 100, "401/Unauthorized", 100, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
