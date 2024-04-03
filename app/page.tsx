'use client'
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from "mapbox-gl";
import './ui.css';
import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client'
import Worker from 'web-worker';
import TitikGempa from './components/mapbox_marker/titik_gempa';
import GempaBumiAlert from './components/GempaBumiAlert';


mapboxgl.accessToken = 'pk.eyJ1IjoiYmFndXNpbmRyYXlhbmEiLCJhIjoiY2p0dHMxN2ZhMWV5bjRlbnNwdGY4MHFuNSJ9.0j5UAU7dprNjZrouWnoJyg';

interface InfoGempa {
  lng: number;
  lat: number;
  mag: number;
  depth: string;
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement | null>(null); // Update the type of mapContainer ref
  const map = useRef<mapboxgl.Map | null>(null); // Update the type of the map ref
  const [lng, setLng] = useState(116.1153781);
  const [lat, setLat] = useState(0.146658);
  const [zoom, setZoom] = useState(5);

  const geoJsonData = useRef<any>(null);
  const worker = useRef<Worker | null>(null);
  const [socket, setSocket] = useState<any>(null);

  const adaGempa = useRef<boolean>(false);
  // const [titikGempas, setTitikGempas] = useState<TitikGempa[]>([]);

  const tgs = useRef<TitikGempa[]>([]);
  const [alertGempaBumis, setAlertGempaBumis] = useState<InfoGempa[]>([]);
  const infoGempas = useRef<InfoGempa[]>([]);

  const lastGempaId = useRef<string>('');


  const warningHandler = async (data: any) => {
    infoGempas.current.push(data);
    setAlertGempaBumis(infoGempas.current);
    await new Promise(r => setTimeout(r, 6000));
    const time = new Date().toLocaleTimeString();
    if (!map.current) return;
    map.current.flyTo({
      center: [data.lng, data.lat],
      zoom: 7,
      essential: true
    });
    const id = `tg-${time}`;
    const tg = new TitikGempa(id, {
      coordinates: [data.lng, data.lat],
      pWaveSpeed: 6000,
      sWaveSpeed: 3000,
      map: map.current!,
    });

    // setTitikGempas([...titikGempas, tg]);
    tgs.current.push(tg);

    if (worker.current != null) {
      // console.log('ada gempa');
      adaGempa.current = true;
      // setInterval(() => {
      //   sendWave();
      // }, 500);

      sendWave();
    }
  }

  const socketInitializer = () => {
    if (socket != null) return;
    fetch('/api/socket')
      .then(() => {
        let s = io();
        
        setSocket(s);
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });
  };

  const initWorker = () => {
    worker.current = new Worker(
      new URL('./worker.mjs', import.meta.url),
      { type: 'module' }
    );

    worker.current.postMessage({ type: 'geoJsonData', data: geoJsonData.current });

    worker.current.addEventListener('message', (event: any) => {
      const data = event.data;
      // if (data.type == "checkMultiHighlightArea" && data.id == "s-wave") {
      //   recieveSWave(data);
      // }

      // if (data.type == "checkMultiHighlightArea" && data.id == "p-wave") {
      //   recievePWave(data);
      // }

      if (data.type == "checkMultiHighlightArea" && data.id == "wave") {
        recieveWave(data);
      }
    });
  }

  const loadGeoJsonData = () => {
    fetch('/all_kabkota_ind.geojson')
      .then(response => response.json())
      .then(data => {
        geoJsonData.current = data;
        map.current!.on('load', () => {
          map.current!.addSource('wilayah', {
            type: 'geojson',
            generateId: true,
            data: data
          });
          map.current!.addLayer({
            'id': 'outline',
            'type': 'line',
            'source': 'wilayah',
            'layout': {},
            'paint': {
              'line-color': '#807a72',
              'line-width': 1
            }
          });
        });
        getTitikGempaJson();
        getGempa();

        initWorker();

      }).catch(error => console.error('Error fetching data:', error));
  };


  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: zoom,
      maxZoom: 22,
    });

    loadGeoJsonData();
    socketInitializer();
  }, [socket,alertGempaBumis]);
  
  useEffect(()=>{
    console.log(alertGempaBumis);
 },[alertGempaBumis])

 useEffect(() => {
  if (!socket) return;
  socket.on('connect', () => {
    console.log('connected');
  });
  socket.on('warning', (v: any) => {
    warningHandler(v);
  });
  return () => {
    socket.removeAllListeners();
  };
 },[socket]);


  const sendWave = () => {
    const pWaves = tgs.current.map((v: TitikGempa) => {
      return {
        center: v.center,
        radius: v.pWaveRadius
      }
    });
    const sWaves = tgs.current.map((v: TitikGempa) => {
      return {
        center: v.center,
        radius: v.sWaveRadius
      }
    });
    worker.current!.postMessage({ type: 'checkMultiHighlightArea', pWaves: pWaves, sWaves: sWaves, id: "wave" });
  }


  const isEqual = (a, b) => a.id === b.id && a.name === b.name;


  const recieveWave = (data: any) => {
    const areas = data.area;

    // Hapus data array objek yang sama
    const uniqueData = areas.filter((obj, index, self) =>
      index === self.findIndex((t) => isEqual(t.properties, obj.properties))
    );
    if (map.current!.getSource('hightlight-wave')) {
      (map.current!.getSource('hightlight-wave') as mapboxgl.GeoJSONSource).setData({ "type": "FeatureCollection", "features": uniqueData });
    } else {
      map.current!.addSource('hightlight-wave', {
        'type': 'geojson',
        'data': { "type": "FeatureCollection", "features": uniqueData }
      });
    }

    if (!map.current!.getLayer('hightlight-wave-layer')) {
      map.current!.addLayer({
        'id': 'hightlight-wave-layer',
        'type': 'fill',
        'source': 'hightlight-wave',
        'layout': {},
        'paint': {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.8
        }
      });

      map.current!.moveLayer('outline');
      for (let tg of tgs.current) {
        map.current!.moveLayer(tg.id);
      }
    }

    sendWave();
  }

  function getTitikGempaJson() {
    const url = "https://bmkg-content-inatews.storage.googleapis.com/gempaQL.json";
    map.current!.on('load', () => {
      //check earthquakes layer
      if (map.current!.getLayer('earthquakes-layer')) {
        //update source
        (map.current!.getSource('earthquakes') as mapboxgl.GeoJSONSource).setData(url);
      } else {
        //add source
        map.current!.addSource('earthquakes', {
          type: 'geojson',
          // Use a URL for the value for the `data` property.
          data: url
        });

        map.current!.addLayer({
          'id': 'earthquakes-layer',
          'type': 'circle',
          'source': 'earthquakes',
          'paint': {
            'circle-radius': ["to-number", ['get', 'mag']],
            'circle-stroke-width': 2,

            'circle-color': [
              "case",
              //depth <= 50 red, depth <= 100 orange, depth <= 250 yellow, depth <= 600 green, depth > 600 blue
              ['<=', ["to-number", ['get', 'depth']], 50],
              "red",
              ['<=', ["to-number", ['get', 'depth']], 100],
              "orange",
              ['<=', ["to-number", ['get', 'depth']], 250],
              "yellow",
              ['<=', ["to-number", ['get', 'depth']], 600],
              "green",
              "blue",
            ],
            'circle-stroke-color': 'white'
          }
        });
      }


    });
  }

  function getGempa() {
    const url = "https://bmkg-content-inatews.storage.googleapis.com/datagempa.json"
    fetch(url)
      .then(response => response.json())
      .then((data) => {
        console.log(data);
        lastGempaId.current = data.identifier;
        getGempaPeriodik();
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });
  }

  function getGempaPeriodik() {
    setInterval(() => {
      const url = "https://bmkg-content-inatews.storage.googleapis.com/datagempa.json"
      //await fetch
      fetch(url)
        .then(response => response.json())
        .then((data) => {
          if (lastGempaId.current != data.identifier) {
            lastGempaId.current = data.identifier;
            const coordinates = data.info.point.coordinates.split(",");
            warningHandler({
              lng: parseFloat(coordinates[0]),
              lat: parseFloat(coordinates[1]),
              mag: parseFloat(data.info.magnitude),
              depth: data.info.depth
            });
          }
        })
        .catch((error) => {
          console.error('Error initializing socket:', error);
        });
    }, 5000);
  }



  return (
    <div>

      <div ref={mapContainer} className="w-full h-screen" />

      {alertGempaBumis.map((v, i) => {
        return <div key={i}>
          <GempaBumiAlert  
          key={i}
          props={
            {
              magnitudo: v.mag || 9.0,
              kedalaman: v.depth || '0 km',
              show: true,
              closeInSecond: 5
            }
          } />
        </div>
      })}


    </div>

  );
}
