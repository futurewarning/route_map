import './style.css';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

var map = new Map({
  target: 'map',
  layers: [new TileLayer({source: new OSM()})],
  view: new View({center: [5244191, 2069874], zoom: 2})
});

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
