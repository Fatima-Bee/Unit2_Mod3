// Due to the way the data was (multiple types of surveys) I had to group the states and them the features to be able to make the pop ups appear only once per state and
// have the option of a dropdown box to show if they have multiple survey types

var map;
var dataLayer;
var allFeatures = [];
var currentIndex = 0;
var currentYearIndex = 0;
var selectedFeature = null;
var chartInstance = null;
var groupedStates = {};  
var groupedFeatures = [];  
var markers = [];  

// --- NEW: cities outbreak data (CSV) ---
var cityData = [];
var cityLayer = null;
var cityMarkers = [];

// Measles CSV columns exist for these exact years:
var measlesYears = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025];

// Map your existing slider index (11 positions) to the closest measles year:
var sliderIndexToMeaslesYear = [1990, 1990, 2000, 2000, 2010, 2010, 2015, 2015, 2020, 2020, 2025];

var attributes = [
    "2013-14", "2014-15", "2015-16", "2016-17",
    "2017-18", "2018-19", "2019-20", "2020-21",
    "2021-22", "2022-23", "2023-24"
];

function createMap() {
    map = L.map('map', {
        center: [37.8, -96],
        zoom: 4
    });

    L.tileLayer('https://api.mapbox.com/styles/v1/fatima-alejo/cmczcgxsj009u01qnc3ee4gke/tiles/512/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZmF0aW1hLWFsZWpvIiwiYSI6ImNtOGN4MWEwbTI0eTkyaXBzc2VpZXZqdXcifQ.OOX9uS34z6I0ztBKBPSbtA', {
        attribution: '© OpenStreetMap, © Mapbox',
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 19
    }).addTo(map);

    getData();
}
//We need to call the geoJSON data

function getData() {
    // --- CHANGED: also load the CSV (kept your original flow) ---
    Promise.all([
        fetch("data/MMR_Coverage_States_NoNaN.geojson").then(r => r.json()),
        fetch("data/cdc_measles_us_cities_1990_2025.csv").then(r => r.text())
    ])
    .then(([json, csvText]) => {
        allFeatures = json.features;

        // parse CSV (no extra libs)
        cityData = parseCSV(csvText);

        // Here is where we group the data based on the values
        //first we do it by geography (states)
        //then we we use createpropsymbols to group the multiple years to its related survery

        allFeatures.forEach(feature => {
            var stateName = feature.properties.geography;
            if (!groupedStates[stateName]) groupedStates[stateName] = [];
            groupedStates[stateName].push(feature);
        });

        groupedFeatures = Object.keys(groupedStates).map(stateName => groupedStates[stateName][0]);

        selectedFeature = groupedFeatures[0];
        createPropSymbols(attributes[currentYearIndex]);
        createSequenceControls();
        createLegend();
        updateLegendWithState(selectedFeature);

        // --- NEW: draw city outbreak circles and update legend min/max ---
        createCityCircles(getCurrentMeaslesYear());
        updateLegendMeasles(getCurrentMeaslesYear());
    });
}

// simple CSV parser -> array of objects with numeric fields parsed
function parseCSV(text) {
    var lines = text.trim().split(/\r?\n/);
    var headers = lines[0].split(",").map(s => s.trim());
    var rows = [];

    for (var i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        var cols = [];
        // proper CSV split (handles commas inside quotes)
        var re = /("([^"]|"")*"|[^,]+)/g;
        var m; 
        while ((m = re.exec(lines[i])) !== null) cols.push(m[0].replace(/^"|"$/g, "").replace(/""/g, '"'));

        var obj = {};
        headers.forEach((h, idx) => {
            var v = cols[idx];
            if (["Latitude","Longitude"].includes(h) || /^Measles_\d{4}$/.test(h)) {
                var num = parseFloat(v);
                obj[h] = isNaN(num) ? null : num;
            } else {
                obj[h] = v;
            }
        });
        rows.push(obj);
    }
    return rows;
}

//Here we create the popups, again we need to make sure that we identify that the states are grouped

function createPropSymbols(attribute) {
    if (dataLayer) map.removeLayer(dataLayer);

    markers = [];

    dataLayer = L.geoJSON({ type: 'FeatureCollection', features: groupedFeatures }, {
        pointToLayer: function (feature, latlng) {
            var stateName = feature.properties.geography;
            var stateSurveys = groupedStates[stateName];

            //This variable is how we get the dropdown box to work, we orginize it by the survery type

            var dropdown = `<select id="surveySelector-${stateName}">`;
            stateSurveys.forEach(survey => {
                dropdown += `<option value="${survey.properties.survey_type}">${survey.properties.survey_type}</option>`;
            });
            dropdown += `</select>`;

            var latestYear = attributes[attributes.length - 1];
            var latestSurvey = stateSurveys[0];
            var value = latestSurvey.properties[latestYear];

            //This almost destroyed me, I ended up realizing that the geojson data CANNOT have NaN values so I replaced then all with null
            //the code here states isNaN but I am too afraid to mess around with it and possibly break it again so I left it

            var popupContent = `
                <b>${stateName}</b><br>
                Survey Type: ${dropdown}
                <div id="popupData-${stateName}">
                    Coverage: ${isNaN(value) ? 'No Data' : (value * 100).toFixed(1) + '%'}<br>
                    Year: ${latestYear}
                </div>
            `;

            //These are the markers that are forthe state

            var marker = L.circleMarker(latlng, {
                fillColor: "#5dade2",
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8,
                radius: 8
            }).bindPopup(popupContent);

            //This makes sure that the popups are only 1 per state again this almost destroyed me
            //I kept having multiple popup for the same state, at first I thought I messed up the data but when I went over the excel sheet I realized it was the survey type
            //Making it so it will only show one pop up and move to the next state and not just stay on the market woth no pop up due to multiple surveys was a pain
            //I used so many youtube tutorials and I also ended up caving and asking chatGPT to review the code to see what was wrong only to realize was grouping the states
            //but not the features

            marker.on('popupopen', function() {
                var selector = document.getElementById(`surveySelector-${stateName}`);
                if (selector) {
                    selector.addEventListener('change', function() {
                        var selectedType = this.value;
                        var selectedSurvey = stateSurveys.find(s => s.properties.survey_type === selectedType);
                        var newValue = selectedSurvey.properties[latestYear];

                        document.getElementById(`popupData-${stateName}`).innerHTML = `
                            Coverage: ${isNaN(newValue) ? 'No Data' : (newValue * 100).toFixed(1) + '%'}<br>
                            Year: ${latestYear}
                        `;

                        updateLegendWithState(selectedSurvey);
                    });
                }
            });

            markers.push(marker);
            return marker;
        }
    }).addTo(map);

    showPopupForIndex(currentIndex);
}

//These are for the buttons and slider, specifically the HMTL that displays what they look like
//I also added a comment under the slider because when I sent this out for review to some friends they thought the slider was not working
//so the comment helps users to notice the changing data in the popups

function createSequenceControls() {
    var SequenceControl = L.Control.extend({
        options: { position: 'bottomleft' },

        onAdd: function () {
            var container = L.DomUtil.create('div', 'sequence-control-container');
            container.innerHTML = `
                <div class="button-row">
                <button class="step" id="reverse" title="Previous">&#8592;</button>
                <input type="range" class="range-slider" min="0" max="${attributes.length - 1}" value="0" step="1">
                <button class="step" id="forward" title="Next">&#8594;</button>
                <button class="step" id="recenter" title="Recenter">Recenter</button>
                </div>
                <div class="slider-label">Slide to change the year</div>
                `;
            L.DomEvent.disableClickPropagation(container);
            return container;
        }
    });

    map.addControl(new SequenceControl());

    //this is what makese the buttons and slider actually work

    document.querySelector('.range-slider').addEventListener('input', function () {
        currentYearIndex = parseInt(this.value);
        updatePropSymbols(attributes[currentYearIndex]);

        // --- NEW: keep measles circles + legend in sync with the slider ---
        var measlesYear = getCurrentMeaslesYear();
        updateCityCircles(measlesYear);
        updateLegendMeasles(measlesYear);
    });

    document.getElementById('forward').addEventListener('click', function () {
        currentIndex = (currentIndex + 1) % groupedFeatures.length;
        selectedFeature = groupedFeatures[currentIndex];
        updateLegendWithState(selectedFeature);
        showPopupForIndex(currentIndex);
    });

    document.getElementById('reverse').addEventListener('click', function () {
        currentIndex = (currentIndex - 1 + groupedFeatures.length) % groupedFeatures.length;
        selectedFeature = groupedFeatures[currentIndex];
        updateLegendWithState(selectedFeature);
        showPopupForIndex(currentIndex);
    });

    document.getElementById('recenter').addEventListener('click', function () {
    map.setView([37.8, -96], 4, { animate: true });
    });

}

//This is to convert the decimal points to percentages

function updatePropSymbols(attribute) {
    markers.forEach(marker => {
        var stateName = marker.feature.properties.geography;
        var stateSurveys = groupedStates[stateName];
        var value = stateSurveys[0].properties[attribute];

        marker.setRadius(8);

        var popupData = document.getElementById(`popupData-${stateName}`);
        if (popupData) {
            popupData.innerHTML = `Coverage: ${isNaN(value) ? 'No Data' : (value * 100).toFixed(1) + '%'}<br>Year: ${attribute}`;
        }
    });
}

function showPopupForIndex(index) {
    if (!dataLayer) return;

    var layer = markers[index];
    if (layer) {
        map.flyTo(layer.getLatLng(), 5, { animate: true });
        layer.openPopup();
    }
}

//This is for the legend, due to the data type, I couldnt really make the orginal SVG circles look right, so I opted for a line graph (that honestly I don't really like)
//It displays the data in a more clearer way

function createLegend() {
    var LegendControl = L.Control.extend({
        options: { position: 'bottomright' },

        onAdd: function () {
            var container = L.DomUtil.create('div', 'legend-control-container');
            // --- CHANGED: keep same container but add an SVG we can reuse for measles too ---
            container.innerHTML = '<h4 id="legend-title">State Exposure Count</h4><svg id="legendSVG" width="160" height="120"></svg>';
            return container;
        }
    });

    map.addControl(new LegendControl());
}

//This is so that the name of the state shows in the legend

function updateLegendWithState(feature) {
    // keep your existing title behavior
    document.getElementById('legend-title').innerHTML = feature.properties.geography + ' Exposure Count';

    // do not draw coverage shapes here (you asked to use circles for outbreaks in legend)
    // measles legend is drawn by updateLegendMeasles()
}

// --- NEW: helpers for measles layer/legend ---

function getCurrentMeaslesYear() {
    return sliderIndexToMeaslesYear[currentYearIndex];
}

function measlesValueForCity(cityObj, year) {
    var key = "Measles_" + year;
    var v = cityObj[key];
    return (v === null || isNaN(v)) ? 0 : v;
}

function createCityCircles(year) {
    if (cityLayer) { map.removeLayer(cityLayer); }
    cityLayer = L.layerGroup();
    cityMarkers = [];

    // compute max for scaling
    var maxVal = 0;
    cityData.forEach(c => { maxVal = Math.max(maxVal, measlesValueForCity(c, year)); });
    var denom = maxVal > 0 ? maxVal : 1;

    cityData.forEach(c => {
        if (c.Latitude == null || c.Longitude == null) return;
        var val = measlesValueForCity(c, year);

        var m = L.circleMarker([c.Latitude, c.Longitude], {
            radius: 4 + (val/denom) * 16,            // 4..20 px
            fillColor: getOutbreakColor(val, denom), // light->dark red
            color: "#ffffff",
            weight: 1,
            fillOpacity: 0.85
        }).bindPopup(`<b>${c.City}, ${c.State}</b><br>Measles Cases: ${val}<br>Year: ${year}`);

        m.addTo(cityLayer);
        cityMarkers.push({ marker: m, ref: c });
    });

    cityLayer.addTo(map);
}

function updateCityCircles(year) {
    if (!cityLayer) return;

    var maxVal = 0;
    cityData.forEach(c => { maxVal = Math.max(maxVal, measlesValueForCity(c, year)); });
    var denom = maxVal > 0 ? maxVal : 1;

    cityMarkers.forEach(obj => {
        var c = obj.ref;
        var val = measlesValueForCity(c, year);
        obj.marker.setRadius(4 + (val/denom) * 16);
        obj.marker.setStyle({ fillColor: getOutbreakColor(val, denom) });
        obj.marker.setPopupContent(`<b>${c.City}, ${c.State}</b><br>Measles Cases: ${val}<br>Year: ${year}`);
    });
}

function getOutbreakColor(value, maxVal) {
    var ratio = (maxVal > 0) ? (value / maxVal) : 0;
    // interpolate from light to dark red
    var r = 255;
    var g = Math.round(204 * (1 - ratio)); // 204 -> 0
    var b = Math.round(204 * (1 - ratio)); // 204 -> 0
    return `rgb(${r},${g},${b})`;
}

// draw min/max measles circles + values in the legend
function updateLegendMeasles(year) {
    var svg = document.getElementById('legendSVG');
    if (!svg) return;
    svg.innerHTML = '';

    var vals = cityData.map(c => measlesValueForCity(c, year));
    if (!vals.length) return;

    var min = Math.min(...vals);
    var max = Math.max(...vals);
    var denom = max > 0 ? max : 1;

    // positions
    var x = 30;
    var yMin = 35;
    var yMax = 85;

    // circles
    var rMin = 4 + (min/denom)*16;
    var rMax = 4 + (max/denom)*16;

    svg.innerHTML += `
        <text x="10" y="15">Measles (min / max)</text>
        <circle cx="${x}" cy="${yMin}" r="${rMin}" fill="${getOutbreakColor(min,denom)}" stroke="#fff" stroke-width="1"></circle>
        <text x="${x+30}" y="${yMin+4}">${min}</text>
        <circle cx="${x}" cy="${yMax}" r="${rMax}" fill="${getOutbreakColor(max,denom)}" stroke="#fff" stroke-width="1"></circle>
        <text x="${x+30}" y="${yMax+4}">${max}</text>
    `;
}

//I wanted to add a pop up before you enter the map so it can explain the purpose

document.addEventListener('DOMContentLoaded', function() {
    var popup = document.getElementById('welcomePopup');
    var closeBtn = document.getElementById('closePopup');

    closeBtn.addEventListener('click', function() {
        popup.style.display = 'none';
    });

    createMap();
});
