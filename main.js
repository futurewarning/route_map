import Feature from "ol/Feature";
import './style.css';
import OSM from 'ol/source/OSM';
import LineString from "ol/geom/LineString";
import Map from "ol/Map";
import Icon from "ol/style/Icon";
import VectorSource from "ol/source/Vector";
import View from "ol/View";
import { Stroke, Style } from "ol/style";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer.js";
import { getVectorContext } from "ol/render";
import { getWidth } from "ol/extent";

const tileLayer = new TileLayer({
  source: new OSM({})
});

const map = new Map({
  layers: [tileLayer],
  target: "map",
  view: new View({ center: [5244191, 2069874], zoom: 2 })
});

const style = new Style({
  stroke: new Stroke({
    color: "#000000",
    width: 1
  })
});

const flightsSource = new VectorSource({

  loader: function () {
    const url = "data/routes.json";
    fetch(url)
      .then(function (response) {
        return response.json();
      })
      .then(function (json) {
        const flightsData = json.flights;
        for (let i = 0; i < flightsData.length; i++) {
          const flight = flightsData[i];
          const from = flight[0];
          const to = flight[1];

          // create an arc circle between the two locations
          const arcGenerator = new arc.GreatCircle(
            { x: from[1], y: from[0] },
            { x: to[1], y: to[0] }
          );

          const arcLine = arcGenerator.Arc(100, { offset: 10 });
          // paths which cross the -180°/+180° meridian are split
          // into two sections which will be animated sequentially
          const features = [];
          arcLine.geometries.forEach(function (geometry) {
            const line = new LineString(geometry.coords);
            line.transform("EPSG:4326", "EPSG:3857");

            features.push(
              new Feature({
                geometry: line,
                finished: false
              })
            );
          });
          // add the features with a delay so that the animation
          // for all features does not start at the same time
          addLater(features, i * 0);
        }
        tileLayer.on("postrender", animateFlights);
      });
  }
});

const flightsLayer = new VectorLayer({
  source: flightsSource,
  style: function (feature) {
    // if the animation is still active for a feature, do not
    // render the feature with the layer style
    if (feature.get("finished")) {
      return style;
    }
    return null;
  }
});

map.addLayer(flightsLayer);

const pointsPerMs = 0.02;
function animateFlights(event) {
  const vectorContext = getVectorContext(event);
  const frameState = event.frameState;
  vectorContext.setStyle(style);

  const features = flightsSource.getFeatures();
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    if (!feature.get("finished")) {
      // only draw the lines for which the animation has not finished yet
      const coords = feature.getGeometry().getCoordinates();
      const elapsedTime = frameState.time - feature.get("start");
      if (elapsedTime >= 0) {
        const elapsedPoints = elapsedTime * pointsPerMs;

        if (elapsedPoints >= coords.length) {
          feature.set("finished", true);
        }

        const maxIndex = Math.min(elapsedPoints, coords.length);
        const currentLine = new LineString(coords.slice(0, maxIndex));

        // animation is needed in the current and nearest adjacent wrapped world
        const worldWidth = getWidth(map.getView().getProjection().getExtent());
        const offset = Math.floor(map.getView().getCenter()[0] / worldWidth);

        // directly draw the lines with the vector context
        currentLine.translate(offset * worldWidth, 0);
        vectorContext.drawGeometry(currentLine);
        currentLine.translate(worldWidth, 0);
        vectorContext.drawGeometry(currentLine);
      }
    }
  }
  map.render();
}

function addLater(features, timeout) {
  window.setTimeout(function () {
    let start = Date.now();
    features.forEach(function (feature) {
      feature.set("start", start);
      flightsSource.addFeature(feature);
      const duration =
        (feature.getGeometry().getCoordinates().length - 1) / pointsPerMs;
      start += duration;
    });
  }, timeout);
}

var markers = new VectorLayer({
  source: new VectorSource(),
  style: new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: "https://upload.wikimedia.org/wikipedia/commons/e/ec/RedDot.svg"
    })
  })
});
map.addLayer(markers);
map.on('postcompose',function(e){
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = 'rgba(0,0,0,' + 1.0 + ')';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgb(' + [200,200,200].toString() + ')';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    canvas.style.filter="invert(99%)";
   });