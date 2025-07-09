//this portion creates the map

var minValue;

//Step 1: Create Map
    function createMap(){

//create the map

map = L.map('map', {
    center:[0,0],
    zoom: 2
});

L.tileLayer('https://api.mapbox.com/styles/v1/fatima-alejo/cm9641e8k003r01qh78je06h6/tiles/512/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZmF0aW1hLWFsZWpvIiwiYSI6ImNtOGN4MWEwbTI0eTkyaXBzc2VpZXZqdXcifQ.OOX9uS34z6I0ztBKBPSbtA', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
                 '© <a href="https://www.mapbox.com/">Mapbox</a>',

    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 19
}).addTo(map);

//call getData funtion
    getData(map);
};

function calculateMinValue(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each city
    for(var city of data.features){
        //loop through each year
        for(var year = 1985; year <= 2015; year+=5){
              //get population for current year
              var value = city.properties["Pop_"+ String(year)];
              //add value to array
              allValues.push(value);
        }
    }
    //get minimum value of our array
    minValue = Math.min(...allValues)

    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius

    return radius;
};
//Step 3: Add the circle markers for to the map
function createPropSymbols(data){

    //step 4: define whick attribute to visualize with proportional symbols
    var attribute = "Pop_2015";
    
    // now we create the markers        
            var geojsonMarkerOptions = {
                fillColor: "#ffc5c0",
                color: "#fff",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8,
                radius: 8
            };

        L.geoJSON(data, {
    pointToLayer: function (feature, latlng) {

        // Step 5: determine the value for the selected attribute

        var attValue = Number(feature.properties[attribute]);
        
        // Step 6: Give each feature's circle marker a radius based on its attribute value
        
        geojsonMarkerOptions.radius = calcPropRadius(attValue);

        // Create the circle marker
        
        var layer = L.circleMarker(latlng, geojsonMarkerOptions);

        // Create the popup content
        
        var popupContent = "<p><b>City:</b> " + feature.properties.City + "</p><p><b>" + attribute + ":</b> " + feature.properties[attribute] + "</p>";

        // Attach the popup to the marker
        
        layer.bindPopup(popupContent);

        // Return the circle marker to the L.geoJSON
        
        return layer;
    }
}).addTo(map);
}

//Step 7: slider portiton

function createSequenceControls(){
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);

    //slider attributes
    document.querySelector(".range-slider").max = 6;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    document.querySelector('#reverse').insertAdjacentHTML('beforeend',"<img src='img/leftflower.png' width='30' height='30'>");
    document.querySelector('#forward').insertAdjacentHTML('beforeend',"<img src='img/rightflower.png' width='30' height='30'>");
}

//Step 2: importing the GeoJSON data

function getData(map){

    //load the data using fetch funtion

    fetch("data/MegaCities.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            //calculate the minimum data value
            minValue = calculateMinValue(json);
            //call funtion to create proportional symbols
            createPropSymbols(json);
            createSequenceControls();
        })
};


document.addEventListener('DOMContentLoaded',createMap)