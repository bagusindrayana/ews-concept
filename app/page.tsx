'use client'
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from "mapbox-gl";
import './ui.css';
import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client'
import Worker from 'web-worker';
import TitikGempa from './components/mapbox_marker/titik_gempa';
import GempaBumiAlert from './components/GempaBumiAlert';
import * as turf from '@turf/turf'
import Card from './components/card/card';
import { createRoot } from 'react-dom/client';
import AnimatedPopup from 'mapbox-gl-animated-popup';
import ItemKotaTerdampak from './components/ItemKotaTerdampak';
import { KotaTerdampak, InfoGempa, InfoTsunami } from "../libs/interface";
import Jam from './components/Jam';
const { DateTime } = require("luxon");
import { IoLocationSharp } from "react-icons/io5";
import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";
import TitikTsunami from './components/mapbox_marker/titik_tsunami';

mapboxgl.accessToken = 'pk.eyJ1IjoiYmFndXNpbmRyYXlhbmEiLCJhIjoiY2p0dHMxN2ZhMWV5bjRlbnNwdGY4MHFuNSJ9.0j5UAU7dprNjZrouWnoJyg';

let socket;
export default function Home() {


  const dangerSound = "/sounds/siren-alarm-96503.mp3"
  const smallEarthQuakeSound = "/sounds/wrong-answer-129254.mp3"
  const tsunamiAlertSound = "sounds/security-alarm-80493.mp3"
  const mapContainer = useRef<HTMLDivElement | null>(null); // Update the type of mapContainer ref
  const map = useRef<mapboxgl.Map | null>(null); // Update the type of the map ref
  const [lng, setLng] = useState(123.90146694265115);
  const [lat, setLat] = useState(-1.370489908625089);
  const [zoom, setZoom] = useState(5);

  const geoJsonData = useRef<any>(null);
  const geoJsonCoastline = useRef<any>(null);
  const geoJsonTitikGempa = useRef<any>(null);
  const worker = useRef<Worker | null>(null);
  const adaGempa = useRef<boolean>(false);
  const tgs = useRef<TitikGempa[]>([]);
  const titikGempaBaru = useRef<TitikGempa[]>([]);

  const tts = useRef<TitikTsunami[]>([]);

  const kts = useRef<KotaTerdampak[]>([]);
  const markerDaerahs = useRef<any[]>([]);
  const daerahTsunami = useRef<any[]>([]);

  const lastGempaId = useRef<string>('');
  const lastGempaKecilId = useRef<string>('');

  const [detailInfoGempa, setDetailInfoGempa] = useState<InfoGempa | null>(null);
  const [loadingScreen, setLoadingScreen] = useState<boolean>(true);

  const [gempaDirasakan, setGempaDirasakan] = useState<TitikGempa | null>(null);
  const [gempaTerakhir, setGempaTerakhir] = useState<TitikGempa | null>(null);
  const [events, setEvents] = useState<TitikGempa[]>([]);
  const [alertGempaBumi, setAlertGempaBumi] = useState<TitikGempa | null>(null);

  const [alertGempaBumis, setAlertGempaBumis] = useState<InfoGempa[]>([]);

  const [alertTsunami, setAlertTsunami] = useState<TitikTsunami | null>(null);


  const [infoTsunami, setInfoTsunami] = useState<TitikTsunami | null>(null);
  const [shakeMap, setShakeMap] = useState<string | null>(null);

  const blinkInterval = useRef<any>(null);


  const warningHandler = async (data: any) => {
    console.log("WARNING!!!");
    const time = new Date().toLocaleTimeString();
    const id = data.id ?? `tg-${time}`;


    if (!map.current) return;
    // map.current.flyTo({
    //   center: [data.lng, data.lat],
    //   zoom: 7,
    //   essential: true
    // });

    const nig: InfoGempa = {
      id: id,
      lng: parseFloat(data.lng),
      lat: parseFloat(data.lat),
      mag: parseFloat(data.mag || 9.0),
      depth: data.depth || "10 Km",
      message: data.message,
      place: data.place,
      time: data.time || new Date().toLocaleString(),
      listKotaTerdampak: [],
      mmi: parseInt((data.time || new Date().toLocaleString())?.replaceAll("-", "").replaceAll(" ", "").replaceAll(":", ""))
    };

    const tg = new TitikGempa(id, nig, {
      pWaveSpeed: 6000,
      sWaveSpeed: 3000,
      map: map.current!,
      showMarker: true,
      description: data.message,
      showPopup: true,
      showPopUpInSecond: 6,
      zoomToPosition: true
    });
    tgs.current.push(tg);
    titikGempaBaru.current.push(tg);


    setAlertGempaBumis([...alertGempaBumis, nig]);


    // tgs.current.push(tg);
    // tgs.current.sort(function (a: any, b: any) {
    //   return new Date(b.time).getTime() - new Date(a.time).getTime();
    // });
    var bgNotif = new Audio("/sounds/alert-109578.wav");
    bgNotif.volume = 0.3;
    bgNotif.loop = true;
    bgNotif.play();
    const audioDangerElement = document.getElementById('danger');
    setTimeout(() => {

      if (audioDangerElement) {
        (audioDangerElement as HTMLAudioElement).play();
      }
      setTimeout(() => {
        var voice = new Audio("/voice/gempabumi.wav");
        voice.play();
      }, 2000);

      setTimeout(() => {
        fadeOutAudio(bgNotif, 2000);
      }, 6000);
    }, 2000);


    await new Promise(r => setTimeout(r, 6000));

    setEvents(tgs.current);
    if (worker.current != null) {
      adaGempa.current = true;
      console.log("Send Wave");
      sendWave();
    }
    if (audioDangerElement) {
      //set volume down
      (audioDangerElement as HTMLAudioElement).volume = 0.5;
    }

  }

  function blinkCoastline() {
    if (blinkInterval.current) {
      clearInterval(blinkInterval.current);
    }
    blinkInterval.current = setInterval(() => {
      const visibility = map.current!.getLayoutProperty(
        'outline-coastline',
        'visibility'
      );
      map.current!.setLayoutProperty(
        'outline-coastline',
        'visibility',
        visibility == 'visible' ? 'none' : 'visible'
      );
    }, 1000);

  }

  function fadeOutAudio(audioElement, duration) {
    let fadeInterval = 50; // Interval in milliseconds
    let step = audioElement.volume / (duration / fadeInterval); // Volume decrease per interval

    let fadeAudio = setInterval(() => {
      if (audioElement.volume > step) {
        audioElement.volume -= step;
      } else {
        audioElement.volume = 0;
        audioElement.pause(); // Optionally pause the audio when the volume is 0
        clearInterval(fadeAudio); // Stop the interval
      }
    }, fadeInterval);
  }

  const warningTsunamiHandler = async (data: any) => {
    // setInfoTsunami(data);
    if (blinkInterval.current) {
      clearInterval(blinkInterval.current);
    }
    const results: any = [];
    daerahTsunami.current = [];

    const time = new Date().toLocaleTimeString();
    const id = data.id ?? `tg-${time}`;

    const coordinates = data.point.coordinates.split(",");
    const nit: InfoTsunami = {
      id: id,
      lng: parseFloat(coordinates[0]),
      lat: parseFloat(coordinates[1]),
      message: data.description + "\n" + data.instruction,
      level: data.subject,
      time: data.time || new Date().toLocaleString(),
      listKotaTerdampak: []
    };

    let level = "WASPADA";

    for (let x = 0; x < data.wzarea.length; x++) {
      const wz = data.wzarea[x];
      const cek = geoJsonCoastline.current.features.find((f) =>
        wz.district.replaceAll("-", " ")
          .replaceAll("PULAU ", "")
          .replaceAll("KEPULAUAN ", "")
          .replaceAll(" BAGIAN UTARA", "")
          .replaceAll(" BAGIAN BARAT", "")
          .replaceAll(" BAGIAN SELATAN", "")
          .replaceAll(" BAGIAN TIMUR", "")
        ===
        f.properties.alt_name.replaceAll("KABUPATEN ", "")
          .replaceAll("PULAU ", "")
          .replaceAll("KEPULAUAN ", ""));
      if (cek) {

        let color = "yellow";
        if (wz.level == "SIAGA") {
          color = "orange";
        } else if (wz.level == "AWAS") {
          color = "red";
        }
        if (level == "WASPADA" && wz.level == "SIAGA") {
          level = wz.level;
        }

        if (level == "SIAGA" && wz.level == "AWAS") {
          level = wz.level;
        }


        cek.properties.color = color;
        results.push(cek);

        const dist = turf.distance(turf.point([nit.lng, nit.lat]), turf.point([cek.properties.longitude, cek.properties.latitude]));
        const timeDist = Math.floor(dist / 3) * 1000;
        nit.listKotaTerdampak!.push({
          lng: cek.properties.longitude,
          lat: cek.properties.latitude,
          distance: dist,
          name: cek.properties.alt_name,
          hit: false,
          timeArrival: new Date(new Date().getTime() + timeDist)
        });
      } else {
        // console.log(info.wzarea);
        console.log(wz);
      }

      nit.listKotaTerdampak!.sort((a, b) => a.distance - b.distance);

    }

    for (let x = 0; x < results.length; x++) {
      const element = results[x];
      const p: number[] = turf.centroid(element).geometry.coordinates;
      if (markerDaerahs.current.findIndex((el) => el[0] == p[0] && el[1] == p[1]) == -1) {
        markerDaerahs.current.push([p[0], p[1]]);
        const markerParent = document.createElement('div');
        const markerEl = document.createElement('div');
        markerEl.innerHTML = '<p class="uppercase">' + element.properties.alt_name + '</p>';
        markerEl.classList.add('marker-daerah');
        markerEl.classList.add('show-pop-up');
        markerParent.appendChild(markerEl);
        new mapboxgl.Marker(markerParent)
          .setLngLat([p[0], p[1]])
          .addTo(map.current!)

      }

    }

    const tt = new TitikTsunami(id, nit, {
      pWaveSpeed: 6000,
      sWaveSpeed: 3000,
      map: map.current!,
      showMarker: true,
      description: data.description + "\n" + data.instruction,
      showPopup: true,
      showPopUpInSecond: 6,
      zoomToPosition: true,
      closePopUpInSecond: 13
    });
    tts.current.push(tt);

    setAlertTsunami(tt);


    daerahTsunami.current = results;
    if (results.length > 0) {
      if (map.current!.getSource('coastline')) {
        (map.current!.getSource('coastline') as mapboxgl.GeoJSONSource).setData({ "type": "FeatureCollection", "features": results });
      } else {
        map.current!.addSource('coastline', {
          'type': 'geojson',
          'data': { "type": "FeatureCollection", "features": results }
        });
      }
      map.current!.setLayoutProperty(
        'outline-coastline',
        'visibility',
        'visible'
      );

    } else {
      testDemoTsunami();
      return;
    }



    if (!map.current) return;
    // map.current.flyTo({
    //   center: [coordinates[0], coordinates[1]],
    //   zoom: 7,
    //   essential: true
    // });




    blinkCoastline();
    map.current!.moveLayer('outline-coastline');

    // tgs.current.push(nt);
    // setEvents(tgs.current);

    console.log("WARNING TSUNAMI!!!");
    var bgNotif = new Audio("/sounds/security-alarm-63578.wav");
    bgNotif.volume = 0.3;
    bgNotif.loop = true;
    bgNotif.play();
    var notif = new Audio(tsunamiAlertSound);
    notif.loop = true;
    notif.play();
    setTimeout(() => {
      var voice = new Audio("/voice/terdeteksi.wav");
      voice.play();

      setTimeout(() => {
        var voice = new Audio("/voice/" + level.toLowerCase() + ".wav");
        voice.play();
        setTimeout(() => {
          var voice = new Audio("/voice/potensi.wav");
          voice.play();

          if (level == "AWAS") {
            setTimeout(() => {
              var voice = new Audio("/voice/evakuasi.wav");
              voice.play();
              setTimeout(() => {

                fadeOutAudio(notif, 1000);
                fadeOutAudio(bgNotif, 1000);
                // notif.pause();
                // bgNotif.pause();
              }, 4000);
            }, 6000);
          } else {
            setTimeout(() => {
              var voice = new Audio("/voice/informasi.wav");
              voice.play();
              setTimeout(() => {
                fadeOutAudio(notif, 1000);
                fadeOutAudio(bgNotif, 1000);
                // notif.pause();
                // bgNotif.pause();
              }, 4000);
            }, 6000);
          }

        }, 5000);
      }, 5000);
    }, 2000);


    setTimeout(() => {
      const tsunamiWarning: HTMLDivElement = document.querySelector("#tsunami-warning") as HTMLDivElement;
      //find div inside bg-tsunami
      if (tsunamiWarning) {
        const divs = tsunamiWarning.querySelectorAll(".show-pop-up");
        //loop and add class close-pop-up
        divs.forEach((v) => {
          v.classList.add("close-pop-up");
        });
      }

      setShakeMap(data.shakemap);
    }, 9000);
    setTimeout(() => {


      const bgTsunami: HTMLDivElement = document.querySelector("#bg-tsunami .hex-bg") as HTMLDivElement;
      //find div inside bg-tsunami
      if (bgTsunami) {
        const divs = bgTsunami.querySelectorAll("div");
        //loop and add class close-pop-up
        divs.forEach((v) => {
          v.classList.add("close-pop-up");
        });
      }
      setTimeout(() => {
        setAlertTsunami(null);
      }, 1000);
      setInfoTsunami(tt);
    }, 10000);
  }

  const socketInitializer = () => {
    if (socket != null) return;
    socket = io('https://early-warning.potadev.com');

    socket.on('connect', () => {
      console.log('connected');
    });
    socket.on('warning', (v: any) => {

      warningHandler(v);
    });
    socket.on('message', (v: any) => {

      console.log(v);
    });

    socket.on('gempa', (data: any) => {
      updateGempa(data);
    });

    socket.on('tsunami', (data: any) => {
      updateTsunami(data);
    });


  };

  const initWorker = () => {
    worker.current = new Worker(
      new URL('./worker.mjs', import.meta.url),
      { type: 'module' }
    );

    worker.current.postMessage({ type: 'geoJsonData', data: geoJsonData.current, coastline: geoJsonCoastline.current });

    worker.current.addEventListener('message', (event: any) => {
      const data = event.data;
      if (data.type == "checkMultiHighlightArea" && data.id == "wave") {
        recieveWave(data);
      }
    });
  }




  useEffect(() => {
    if (map.current) return () => { };
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: zoom,
      maxZoom: 22,
    });

    map.current.on('load', () => {
      // loadGeoJsonData();
      loadGeoJsonCoastline();
    });


  });





  const sendWave = () => {
    let t: any = [];
    for (let i = 0; i < titikGempaBaru.current.length; i++) {
      const v = titikGempaBaru.current[i];
      if (!v.finish) {
        t.push({
          id: v.id,
          center: v.center,
          mag: v.mag,
          depth: v.depth,
          pWaveRadius: v.pWaveRadius,
          sWaveRadius: v.sWaveRadius,
          areaTerdampak: [],
          message: v.description
        })
      }

    }
    if (t.length > 0) {
      worker.current!.postMessage({ type: 'checkMultiHighlightArea', titikGempa: t, id: "wave" });
    } else {
      console.log("Not Send Wave");
    }
  }


  const isEqual = (a, b) => a.id === b.id && a.name === b.name;


  const recieveWave = async (data: any) => {
    let alerts: InfoGempa[] = [];
    for (let x = 0; x < data.titikGempa.length; x++) {
      const tg = data.titikGempa[x];

      const nig: InfoGempa = {
        id: tg.id,
        lng: parseFloat(tg.center[1]),
        lat: parseFloat(tg.center[0]),
        mag: tg.mag,
        depth: tg.depth,
        message: tg.message,
        place: tg.place,
        time: new Date().toLocaleString(),
        mmi: parseInt(new Date().toLocaleString()?.replaceAll("-", "").replaceAll(" ", "").replaceAll(":", "")),
        listKotaTerdampak: [],
      };

      for (let il = 0; il < tg.areaTerdampak.length; il++) {
        const at = tg.areaTerdampak[il];
        const dist = turf.distance(turf.point([tg.center[0], tg.center[1]]), turf.point([at.center[0], at.center[1]])) - (tg.sWaveRadius / 1000);
        const time = Math.floor(dist / 3) * 1000;
        nig.listKotaTerdampak!.push({
          lng: at.center[1],
          lat: at.center[0],
          distance: dist,
          name: at.alt_name,
          hit: at.hit,
          timeArrival: new Date(new Date().getTime() + time)
        });

      }

      //sort nig.listKotaTerdampak by distance
      nig.listKotaTerdampak!.sort((a, b) => a.distance - b.distance);

      alerts.push(nig);
    }

    //get last alert
    if (alerts.length > 0) {
      const fig = alerts.slice(-1).pop()!;
      setAlertGempaBumi(new TitikGempa(fig.id, fig));
    } else {
      setAlertGempaBumi(null);
    }

    const areas = data.area;

    // Hapus data array objek yang sama
    // const uniqueData = areas.filter((obj, index, self) =>
    //   index === self.findIndex((t) => isEqual(t.properties.mhid, obj.properties.mhid))
    // );

    const uniqueData = areas;

    for (let x = 0; x < uniqueData.length; x++) {
      const element = uniqueData[x];
      const p: number[] = turf.centroid(element).geometry.coordinates;
      if (markerDaerahs.current.findIndex((el) => el[0] == p[0] && el[1] == p[1]) == -1) {
        markerDaerahs.current.push([p[0], p[1]]);
        const markerParent = document.createElement('div');
        const markerEl = document.createElement('div');
        markerEl.innerHTML = '<p class="uppercase">' + element.properties.alt_name + '</p>';
        markerEl.classList.add('marker-daerah');
        markerEl.classList.add('show-pop-up');
        markerParent.appendChild(markerEl);
        new mapboxgl.Marker(markerParent)
          .setLngLat([p[0], p[1]])
          .addTo(map.current!)

      } else {

        const index = kts.current.findIndex((el) => el.lng == p[0] && el.lat == p[1]);
        if (index != -1) {

          // kts.current[index].distance += 16;
          // kts.current[index].hit = element.properties.hit;
          // setKotaTerdampak([...kotaTerdampak, ...kts.current]);
          // countdownTime();
        }
      }


    }

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
      map.current!.moveLayer('outline-coastline');
      for (let tg of tgs.current) {
        if (map.current!.getLayer(tg.id)) {
          map.current!.moveLayer(tg.id);
        }
      }
    }

    // if (map.current!.getSource('coastline')) {
    //   (map.current!.getSource('coastline') as mapboxgl.GeoJSONSource).setData({ "type": "FeatureCollection", "features": data.line });
    // } else {
    //   map.current!.addSource('coastline', {
    //     'type': 'geojson',
    //     'data': { "type": "FeatureCollection", "features": data.line }
    //   });
    // }

    sendWave();
  }

  const hoverWilayah = useRef<any>(null);

  function loadGeoJsonCoastline() {
    fetch('/geojson/garis_pantai.geojson')
      .then(response => response.json())
      .then(data => {
        geoJsonCoastline.current = data;
        if (!map.current!.getSource('coastline')) {
          map.current!.addSource('coastline', {
            type: 'geojson',
            generateId: true,
            data: data
          });
          map.current!.addLayer({
            'id': 'outline-coastline',
            'type': 'line',
            'source': 'coastline',
            'layout': {
              'visibility': 'none',
            },
            'paint': {
              'line-color': ['get', 'color'],
              'line-width': 5,
              'line-opacity': 1
            }
          });

        }
        loadGeoJsonData();
      }).catch((error) => {
        alert("Failed load geojson data : " + error);
        console.error('Error fetching data:', error);
      });
  };

  function loadGeoJsonData() {
    fetch('/geojson/all_kabkota_ind_reduce.geojson')
      .then(response => response.json())
      .then(data => {
        geoJsonData.current = data;
        if (!map.current!.getSource('wilayah')) {
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
              'line-width': 1,
              'line-opacity': 0.7
            }
          });

          map.current!.addLayer({
            'id': 'wilayah-fill',
            'type': 'fill',
            'source': 'wilayah',
            'layout': {

            },
            'paint': {
              'fill-color': 'red',
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                0.1,
                0
              ],

            }
          });

          // map.current!.on('mousemove', 'wilayah-fill', (e: any) => {
          //   if (e.features.length > 0) {
          //     if (hoverWilayah.current !== null) {
          //       map.current!.setFeatureState(
          //         { source: 'wilayah', id: hoverWilayah.current },
          //         { hover: false }
          //       );
          //     }
          //     hoverWilayah.current = e.features[0].id;
          //     map.current!.setFeatureState(
          //       { source: 'wilayah', id: hoverWilayah.current },
          //       { hover: true }
          //     );
          //   }
          // });

          // map.current!.on('mouseleave', 'wilayah-fill', () => {
          //   if (hoverWilayah.current !== null) {
          //     map.current!.setFeatureState(
          //       { source: 'wilayah', id: hoverWilayah.current },
          //       { hover: false }
          //     );
          //   }
          //   hoverWilayah.current = null;
          // });
        }
        // getTitikStationJson();
        getTitikGempaJson();
        getTimezoneGeojson();
        getFaultLineGeojson();
        initWorker();
      }).catch((error) => {
        alert("Failed load geojson data : " + error);
        console.error('Error fetching data:', error);
      });
  };

  function getTitikStationJson() {
    const url = "https://bmkg-content-inatews.storage.googleapis.com/sensor_seismic.json";
    if (map.current) {
      map.current.loadImage(
        '/images/triangle-filled-svgrepo-com.png',
        (error, image: any) => {
          if (error) throw error;

          // Add the image to the map style.
          map.current!.addImage('station-icon', image);

          // Add a data source containing one point feature.
          map.current!.addSource('station', {
            'type': 'geojson',
            'data': url
          });

          // Add a layer to use the image to represent the data.
          map.current!.addLayer({
            'id': 'stations',
            'type': 'symbol',
            'source': 'station', // reference the data source
            'layout': {
              'icon-image': 'station-icon', // reference the image
              'icon-size': 0.05
            }
          });

          map.current!.on('click', 'stations', (e: any) => {
            // Copy coordinates array.
            const coordinates = e.features[0].geometry.coordinates.slice();
            const d = e.features[0].properties;
            const placeholder = document.createElement('div');
            const root = createRoot(placeholder)
            root.render(<Card title={
              <p className='font-bold text-glow-red text-sm text-center' style={{
                color: "red"
              }}>SENSOR SEISMIK</p>
            } className='min-h-48 min-w-48 whitespace-pre-wrap' >
              <div className='text-glow text-sm w-full ' style={{
                fontSize: "10px"
              }}><table className='w-full'>
                  <tbody>
                    <tr>
                      <td className='flex'>ID</td>
                      <td className='text-right break-words pl-2'>{d.id}</td>
                    </tr>
                    <tr>
                      <td className='flex'>Stakeholder</td>
                      <td className='text-right break-words pl-2'>{d.stakeholder}</td>
                    </tr>
                    <tr>
                      <td className='flex'>UPTBMKG</td>
                      <td className='text-right break-words pl-2'>{d.uptbmkg}</td>
                    </tr>
                    <tr>
                      <td className='flex'>Lokasi (Lat,Lng)</td>
                      <td className='text-right break-words pl-2'>{coordinates[0]} , {coordinates[1]}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>);

            new AnimatedPopup({
              openingAnimation: {
                duration: 100,
                easing: 'easeOutSine',
                transform: 'scale'
              },
              closingAnimation: {
                duration: 100,
                easing: 'easeInOutSine',
                transform: 'scale'
              }
            }).setDOMContent(placeholder).setLngLat(coordinates).addTo(map.current!);
          });

          map.current!.on('mouseenter', 'stations', () => {
            map.current!.getCanvas().style.cursor = 'pointer';
          });

          // Change it back to a pointer when it leaves.
          map.current!.on('mouseleave', 'stations', () => {
            map.current!.getCanvas().style.cursor = '';
          });
        }
      );

    }
  }



  function getTitikGempaJson() {
    const url = "https://bmkg-content-inatews.storage.googleapis.com/gempaQL.json?t=" + new Date().getTime();
    fetch(url)
      .then(response => response.json())
      .then((data) => {
        geoJsonTitikGempa.current = data;
        setTimeout(() => {
          document.getElementById("loading-screen")!.style.display = "none";
          setLoadingScreen(false);
        }, 1000);
        let ntg: TitikGempa[] = [];
        for (let index = 0; index < data.features.length; index++) {
          const feature = data.features[index];
          const dt = DateTime.fromSQL(feature.properties.time, { zone: 'UTC' }).setZone("Asia/Jakarta");
          const readAbleTime = dt.toISODate() + " " + dt.toLocaleString(DateTime.TIME_24_WITH_SECONDS)
          ntg.push(new TitikGempa(feature.properties.id, {
            id: feature.properties.id,
            lng: feature.geometry.coordinates[0],
            lat: feature.geometry.coordinates[1],
            mag: feature.properties.mag,
            depth: feature.properties.depth,
            place: feature.properties.place,
            time: readAbleTime,
            mmi: 0
          }));
        }
        tgs.current = ntg;
        setEvents(tgs.current);
        //check earthquakes layer
        if (map.current!.getLayer('earthquakes-layer')) {
          //update source
          (map.current!.getSource('earthquakes') as mapboxgl.GeoJSONSource).setData(data);
        } else {
          //add source
          map.current!.addSource('earthquakes', {
            type: 'geojson',
            data: data
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

        map.current!.on('click', 'earthquakes-layer', (e: any) => {
          // Copy coordinates array.
          const coordinates = e.features[0].geometry.coordinates.slice();
          const d = e.features[0].properties;
          const placeholder = document.createElement('div');
          const root = createRoot(placeholder)
          root.render(<Card title={
            <div className='overflow-hidden'>
              <div className='strip-wrapper'><div className='strip-bar'></div></div>
              <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                <p className='p-1 bg-black font-bold text-xs text-glow'>GEMPA BUMI</p>
              </div>
            </div>
          } className='min-h-48 min-w-48 whitespace-pre-wrap' >
            <div className='text-glow text-sm w-full ' style={{
              fontSize: "10px"
            }}><table className='w-full'>
                <tbody>
                  <tr>
                    <td className='flex'>Magnitudo</td>
                    <td className='text-right break-words pl-2'>{d.mag}</td>
                  </tr>
                  <tr>
                    <td className='flex'>Kedalaman</td>
                    <td className='text-right break-words pl-2'>{d.depth}</td>
                  </tr>
                  <tr>
                    <td className='flex'>Waktu</td>
                    <td className='text-right break-words pl-2'>{new Date(d.time!).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className='flex'>Lokasi (Lat,Lng)</td>
                    <td className='text-right break-words pl-2'>{coordinates[0]} , {coordinates[1]}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>);

          new AnimatedPopup({
            openingAnimation: {
              duration: 100,
              easing: 'easeOutSine',
              transform: 'scale'
            },
            closingAnimation: {
              duration: 100,
              easing: 'easeInOutSine',
              transform: 'scale'
            }
          }).setDOMContent(placeholder).setLngLat(coordinates).addTo(map.current!);
        });

        map.current!.on('mouseenter', 'earthquakes-layer', () => {
          map.current!.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
        map.current!.on('mouseleave', 'earthquakes-layer', () => {
          map.current!.getCanvas().style.cursor = '';
        });

        getGempa();
        getGempaKecil();

      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });

  }

  const hoverTimezone = useRef<any>(null);
  function getTimezoneGeojson() {
    const url = "/geojson/timezones_wVVG8.geojson";
    map.current!.addSource('timezone', {
      'type': 'geojson',
      'generateId': true,
      'data': url
    });


    map.current!.addLayer({
      'id': 'timezone-line',
      'type': 'line',
      'source': 'timezone', // reference the data source
      'layout': {

      },
      'paint': {
        'line-color': 'orange',
        'line-width': 1,
        'line-opacity': 0.5
      }
    });

    const markerParent1 = document.createElement('div');
    const gmt7Marker = createRoot(markerParent1)
    gmt7Marker.render(
      <div className='bordered p-1 text-time show-pop-up text-center'>
        <p className="uppercase text-xl" style={{
          lineHeight: "1rem"
        }}>
          <Jam timeZone="Asia/Jakarta" />
        </p>
        <p>WIB / GMT+7</p>
      </div>
    );

    new mapboxgl.Marker(markerParent1)
      .setLngLat([107.4999769225339, 3.4359354227361933])
      .addTo(map.current!);


    const markerParent2 = document.createElement('div');
    const gmt8Marker = createRoot(markerParent2)
    gmt8Marker.render(
      <div className='bordered p-1 text-time show-pop-up text-center'>
        <p className="uppercase text-xl" style={{
          lineHeight: "1rem"
        }}>
          <Jam timeZone="Asia/Makassar" />
        </p>
        <p>WITA / GMT+8</p>
      </div>
    );
    new mapboxgl.Marker(markerParent2)
      .setLngLat([119.1174733337183, 3.4359354227361933])
      .addTo(map.current!);

    const markerParent3 = document.createElement('div');
    const gmt9Marker = createRoot(markerParent3)
    gmt9Marker.render(
      <div className='bordered p-1 text-time show-pop-up text-center'>
        <p className="uppercase text-xl" style={{
          lineHeight: "1rem"
        }}>
          <Jam timeZone="Asia/Jayapura" />
        </p>
        <p className='text-xs'>WIT / GMT+9</p>
      </div>
    );
    new mapboxgl.Marker(markerParent3)
      .setLngLat([131.58387377752751, 3.4359354227361933])
      .addTo(map.current!)

  }

  function getFaultLineGeojson() {
    const url = "/geojson/indo_faults_lines.geojson";
    map.current!.addSource('indo_faults_lines', {
      'type': 'geojson',
      'generateId': true,
      'data': url
    });

    // Add a layer to use the image to represent the data.
    map.current!.addLayer({
      'id': 'indo_faults_line_layer',
      'type': 'line',
      'source': 'indo_faults_lines', // reference the data source
      'layout': {

      },
      'paint': {
        'line-color': 'red',
        'line-width': 1,
        'line-opacity': 0.5
        // 'fill-color': 'red',
        // 'fill-opacity': [
        //   'case',
        //   ['boolean', ['feature-state', 'hover'], false],
        //   0.1,
        //   0
        // ],

      }
    });



  }

  function getGempa() {
    if (lastGempaId.current) {
      return
    }
    console.log("getGempa");
    const url = "https://bmkg-content-inatews.storage.googleapis.com/datagempa.json?t=" + new Date().getTime();
    fetch(url)
      .then(response => response.json())
      .then((data) => {
        const coordinates = data.info.point.coordinates.split(",");
        lastGempaId.current = data.identifier;
        const sentTime = DateTime.fromISO(data.sent.replace("WIB", ""), { zone: "Asia/Jakarta" });
        const currentTime = DateTime.now().setZone("Asia/Jakarta");
        const readAbleTime = sentTime.toISODate() + " " + sentTime.toLocaleString(DateTime.TIME_24_WITH_SECONDS)

        const nig: InfoGempa = {
          id: data.identifier,
          lng: parseFloat(coordinates[0]),
          lat: parseFloat(coordinates[1]),
          mag: data.info.magnitude || 9.0,
          depth: data.info.depth || "10 Km",
          message: data.info.description,
          time: readAbleTime,
          mmi: parseInt(readAbleTime?.replaceAll("-", "").replaceAll(" ", "").replaceAll(":", ""))
        };

        const cek = tgs.current.find((v) => v.id == data.identifier);
        if ((currentTime.toMillis() - sentTime.toMillis()) < 600000) {
          warningHandler({
            id: data.identifier,
            lng: parseFloat(coordinates[0]),
            lat: parseFloat(coordinates[1]),
            mag: parseFloat(data.info.magnitude),
            depth: data.info.depth,
            message: data.info.description + "\n" + data.info.instruction,
            time: readAbleTime,
            mmi: readAbleTime?.replaceAll("-", "").replaceAll(" ", "").replaceAll(":", "")
          });
          const ntg = new TitikGempa(nig.id, nig, {
            map: map.current!,
            showMarker: true
          });

          setTimeout(() => {

            // setAlertGempaBumi(ntg);
            setGempaDirasakan(ntg);
          }, 6000);
        } else if (!cek) {
          tgs.current.push(new TitikGempa(nig.id, nig));
          //sort by time
          tgs.current.sort(function (a: any, b: any) {
            return new Date(b.time).getTime() - new Date(a.time).getTime();
          })
          geoJsonTitikGempa.current.features.push({
            "geometry": {
              "type": "Point",
              "coordinates": [
                nig.lng,
                nig.lat,
                1
              ]
            },
            "type": "Feature",
            "properties": {
              id: nig.id,
              depth: parseFloat(nig.depth.replaceAll(" Km", "")).toFixed(2),
              mag: nig.mag,
              time: nig.time,
              place: nig.place,
            }
          });
          (map.current!.getSource('earthquakes') as mapboxgl.GeoJSONSource).setData(geoJsonTitikGempa.current);
          setEvents(tgs.current);

        }

        const ntg = new TitikGempa(nig.id, nig, {
          map: map.current!
        });
        setGempaDirasakan(ntg);

        // getGempaPeriodik();



        socketInitializer();
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });


  }

  function getGempaKecil() {
    if (lastGempaKecilId.current) {
      return;
    }
    console.log("getGempaKecil");
    const url = "https://bmkg-content-inatews.storage.googleapis.com/lastQL.json?t=" + new Date().getTime();
    fetch(url)
      .then(response => response.json())
      .then((data) => {
        if (data.features.length > 0) {
          const feature = data.features[0];
          lastGempaKecilId.current = feature.properties.id;

          const sentTime = DateTime.fromSQL(feature.properties.time, { zone: 'UTC' });
          const currentTime = DateTime.now().setZone("UTC");

          const msg = `${feature.properties.place}
Magnitudo : ${feature.properties.mag}
Kedalaman : ${feature.properties.depth}
Lokasi (Lat,Lng) : 
${feature.geometry.coordinates[0]} , ${feature.geometry.coordinates[1]}`;

          const dt = DateTime.fromSQL(feature.properties.time, { zone: 'UTC' }).setZone("Asia/Jakarta");
          const readAbleTime = dt.toISODate() + " " + dt.toLocaleString(DateTime.TIME_24_WITH_SECONDS)
          const nig: InfoGempa = {
            id: feature.properties.id,
            lng: parseFloat(feature.geometry.coordinates[0]),
            lat: parseFloat(feature.geometry.coordinates[1]),
            mag: parseFloat(feature.properties.mag),
            depth: feature.properties.depth || "10 Km",
            message: msg,
            place: feature.properties.place,
            time: readAbleTime,
            mmi: parseInt(readAbleTime?.replaceAll("-", "").replaceAll(" ", "").replaceAll(":", ""))
          };




          //if sent time is less than 10 minutes
          if ((currentTime.toMillis() - sentTime.toMillis()) < 600000) {

            if (map.current) {
              var notif = new Audio(smallEarthQuakeSound);
              notif.play();
              // map.current!.flyTo({
              //   center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
              //   zoom: 7,
              //   essential: true
              // });

              const tg = new TitikGempa(feature.properties.id, nig, {
                pWaveSpeed: 6000,
                sWaveSpeed: 3000,
                map: map.current!,
                description: msg,
                zoomToPosition: true,
                showMarker: true,
                showPopup: true,
                showPopUpInSecond: 1,
              });

              setGempaTerakhir(tg);
              setAlertGempaBumi(new TitikGempa(feature.properties.id, nig));

            }




          } else {
            setGempaTerakhir(new TitikGempa(feature.properties.id, nig));
          }

          const cek = tgs.current.find((v) => v.id == feature.properties.id);
          if (!cek) {

            tgs.current.unshift(new TitikGempa(feature.properties.id, nig));
            geoJsonTitikGempa.current.features.push(feature);
            (map.current!.getSource('earthquakes') as mapboxgl.GeoJSONSource).setData(geoJsonTitikGempa.current);


          }
          setEvents(tgs.current);

        }
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });
  }

  function updateGempa(data) {
    const feature = data.features[0];
    const msg = `${feature.properties.place}
Magnitudo : ${feature.properties.mag}
Kedalaman : ${feature.properties.depth}
Lokasi (Lat,Lng) : 
${feature.geometry.coordinates[0]} , ${feature.geometry.coordinates[1]}`;

    const dt = DateTime.fromSQL(feature.properties.time, { zone: 'UTC' }).setZone("Asia/Jakarta");
    const readAbleTime = dt.toISODate() + " " + dt.toLocaleString(DateTime.TIME_24_WITH_SECONDS)
    const nig: InfoGempa = {
      id: feature.properties.id,
      lng: parseFloat(feature.geometry.coordinates[0]),
      lat: parseFloat(feature.geometry.coordinates[1]),
      mag: parseFloat(feature.properties.mag),
      depth: feature.properties.depth || "10 Km",
      message: msg,
      place: feature.properties.place,
      time: readAbleTime,
      mmi: parseInt(readAbleTime?.replaceAll("-", "").replaceAll(" ", "").replaceAll(":", ""))
    };
    if (lastGempaKecilId.current != feature.properties.id) {
      lastGempaKecilId.current = feature.properties.id;
      var notif = new Audio(smallEarthQuakeSound);
      notif.play();
      if (!map.current) return;


      if (gempaTerakhir != null && gempaTerakhir.setting != null && gempaTerakhir.setting.map != null) {
        gempaTerakhir.removeAllRender();
        gempaTerakhir.removeMarker();
        if (tgs.current.length > 0) {
          const ig = tgs.current[0].infoGempa
          geoJsonTitikGempa.current.features.push({
            "geometry": {
              "type": "Point",
              "coordinates": [
                ig.lng,
                ig.lat,
                1
              ]
            },
            "type": "Feature",
            "properties": {
              id: ig.id,
              depth: ig.depth,
              mag: ig.mag,
              time: ig.time,
              place: ig.place,
            }
          });
          (map.current!.getSource('earthquakes') as mapboxgl.GeoJSONSource).setData(geoJsonTitikGempa.current);
        }
      }

      tgs.current.push(new TitikGempa(nig.id, nig, {
        map: map.current!,
        zoomToPosition: true,
        showMarker: true,
        showPopup: true,
        showPopUpInSecond: 1
      }))
      tgs.current.sort(function (a: any, b: any) {
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });
      setEvents(tgs.current);
      setAlertGempaBumi(new TitikGempa(nig.id, nig))

      const tg = new TitikGempa(lastGempaKecilId.current, nig, {
        pWaveSpeed: 6000,
        sWaveSpeed: 3000,
        map: map.current!,
        description: msg,
      });

      // titikGempaKecil.current = tg;
      setGempaTerakhir(new TitikGempa(nig.id, nig));
    } else {
      const cek = tgs.current.find((v) => v.id == feature.properties.id);
      if (cek && cek.infoGempa.mag != parseFloat(feature.properties.mag)) {
        console.log(cek.infoGempa.mag, parseFloat(feature.properties.mag))
        setGempaTerakhir(new TitikGempa(nig.id, nig));
        setAlertGempaBumi(new TitikGempa(nig.id, nig));
        const indextgs = tgs.current.findIndex((v) => v.id == feature.properties.id);
        tgs.current[indextgs].infoGempa = nig;

      }
    }
  }

  function updateTsunami(data) {
    if (lastGempaId.current != data.identifier) {
      lastGempaId.current = data.identifier;
      const coordinates = data.info.point.coordinates.split(",");
      const sentTime = DateTime.fromISO(data.sent.replace("WIB", ""), { zone: "Asia/Jakarta" });
      const readAbleTime = sentTime.toISODate() + " " + sentTime.toLocaleString(DateTime.TIME_24_WITH_SECONDS);

      warningHandler({
        id: data.identifier,
        lng: parseFloat(coordinates[0]),
        lat: parseFloat(coordinates[1]),
        mag: parseFloat(parseFloat(data.info.magnitude).toFixed(1)),
        depth: data.info.depth,
        message: data.info.description + "\n" + data.info.instruction,
        time: readAbleTime
      });

      if (data.info.wzarea != undefined && data.info.wzarea.length > 0) {
        if (data.info.subject == "Warning Tsunami PD-4") {
          //delete outline-costline layer
          try {
            map.current!.removeLayer('outline-coastline');
            map.current!.removeLayer('outline');
          } catch (error) {

          }
        } else if (data.info.subject.includes("Warning Tsunami")) {
          warningTsunamiHandler(data.info);
        }

      }

    }
  }

  function getGempaPeriodik() {
    setInterval(() => {
      const url = "https://bmkg-content-inatews.storage.googleapis.com/datagempa.json?t=" + new Date().getTime()
      //await fetch
      fetch(url)
        .then(response => response.json())
        .then((data) => {
          updateTsunami(data);
        })
        .catch((error) => {
          console.error('Error initializing socket:', error);
        });
    }, 5000);

    setInterval(() => {
      const url = "https://bmkg-content-inatews.storage.googleapis.com/lastQL.json?t=" + new Date().getTime();
      fetch(url)
        .then(response => response.json())
        .then((data) => {
          updateGempa(data);


        })
        .catch((error) => {
          console.error('Error initializing socket:', error);
        });
    }, 5000);
  }

  const selectedPopup = useRef<any>(null);

  function selectEvent(d: InfoGempa) {
    setDetailInfoGempa(d);
    if (selectedPopup.current) {
      selectedPopup.current.remove();
    }

    if (d.mmi != 0) {
      setShakeMap((d.mmi).toString() + ".mmi.jpg");
    }

    map.current!.flyTo({
      center: [d.lng, d.lat],
      zoom: 6,
      essential: true
    });
    const placeholder = document.createElement('div');
    const root = createRoot(placeholder)
    root.render(<Card title={
      <div className='overflow-hidden'>
        <div className='strip-wrapper'><div className='strip-bar '></div></div>
        <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
          <p className='p-1 bg-black font-bold text-xs text-glow'>GEMPA BUMI</p>
        </div>
      </div>
    } className='min-h-48 min-w-48 whitespace-pre-wrap ' >
      <ul className='text-glow'>
        <li>
          Magnitudo : {d.mag}
        </li>
        <li>
          Kedalaman : {d.depth}
        </li>
        <li>
          Waktu : {new Date(d.time!).toLocaleString()}
        </li>
        <li>
          Lokasi (Lat,Lng) : <br />{d.lat} , {d.lng}
        </li>
      </ul>
    </Card>);

    selectedPopup.current = new AnimatedPopup({
      closeOnClick: false,
      openingAnimation: {
        duration: 100,
        easing: 'easeOutSine',
        transform: 'scale'
      },
      closingAnimation: {
        duration: 100,
        easing: 'easeInOutSine',
        transform: 'scale'
      }
    }).setDOMContent(placeholder).setLngLat([d.lng, d.lat]).addTo(map.current!);
    const cekTable = document.querySelector("#histori_tabel tbody");
    if (cekTable) {
      cekTable.innerHTML = "<tr></tr>";
    }
    setTimeout(() => {
      readTextFile("https://bmkg-content-inatews.storage.googleapis.com/history." + d.id + ".txt");
    }, 500);
  }

  function testDemoGempa() {
    if (geoJsonData.current == null) {
      alert("Wait loading geojson");
      return;
    };
    const bbox = turf.bbox(geoJsonData.current);
    const randomPosition = turf.randomPosition(bbox);
    const mag = (Math.random() * (10 - 5) + 5).toFixed(1);
    const depth = (Math.random() * 20).toFixed(1) + " Km";
    const message = "Gempa Bumi Test Pada Lokasi : Lat : " + randomPosition[1].toFixed(4) + " Lng : " + randomPosition[0].toFixed(4) + " Magnitudo : " + mag + " Kedalaman : " + depth;
    const id = `tg-${new Date().getTime()}`;

    const dt = DateTime.now();
    const readAbleTime = dt.toISODate() + " " + dt.toLocaleString(DateTime.TIME_24_WITH_SECONDS)
    const nig: InfoGempa = {
      id: id,
      lng: randomPosition[0].toFixed(4),
      lat: randomPosition[1].toFixed(4),
      mag: parseFloat(mag),
      depth: depth || "10 Km",
      message: message,
      time: readAbleTime,
      mmi: parseInt(readAbleTime?.replaceAll("-", "").replaceAll(" ", "").replaceAll(":", ""))
    };


    warningHandler(nig);

    // setTimeout(() => {
    //   setInfoGempaDirasakanTerakhir(nig);
    // }, 6000);

  }

  function testDemoTsunami() {
    const url = "https://bmkg-content-inatews.storage.googleapis.com/last30tsunamievent.xml";
    //fecth and parse xml
    fetch(url)
      .then(response => response.text())
      .then(data => {
        const parser = new XMLParser();
        let jObj = parser.parse(data);
        var infos = jObj.alert.info;
        infos = infos.filter((v) => v.wzarea != undefined)
        var randInfo = infos[(Math.random() * infos.length) | 0]

        warningTsunamiHandler(randInfo);

      }).catch((error) => {
        alert("Failed load geojson data : " + error);
        console.error('Error fetching data:', error);
      });

    //warningTsunamiHandler(null);
  }

  function readTextFile(e: string) {

    var t = new XMLHttpRequest;
    t.open("GET", e, !1), t.onreadystatechange = function () {
      if (4 === t.readyState && (200 === t.status || 0 == t.status)) {
        let u = t.responseText.split("\n");
        var table = document.getElementById("histori_tabel") as HTMLTableElement;
        //clear tbody

        let T = u.length - 1;
        for (let t = 1; t < T; t++) {
          let T = u[t].split("|");
          var n = table.insertRow(t),
            a = n.insertCell(0),
            l = n.insertCell(1),
            s = n.insertCell(2),
            i = n.insertCell(3),
            o = n.insertCell(4),
            r = n.insertCell(5),
            d = n.insertCell(6),
            m = n.insertCell(7),
            g = n.insertCell(8),
            c = n.insertCell(9);
          a.innerHTML = T[0], l.innerHTML = T[1], s.innerHTML = T[2], i.innerHTML = T[3], o.innerHTML = T[4], r.innerHTML = T[5], d.innerHTML = T[6], m.innerHTML = T[7], g.innerHTML = T[8], c.innerHTML = T[9]
        }
      }
    }, t.send(null)
  }

  function generateDiv(max) {
    let arrayDivs: any = [];
    for (let index = 0; index < max; index++) {
      arrayDivs.push(<div key={index} style={{
        animationDelay: `${index * 0.002}s`
      }}>
        <img src="/images/warning_hex_red.png" alt="" />
      </div>);
    }

    return arrayDivs;
  }


  return (
    <div>
      <audio id="danger" className='hidden'>
        <source src={dangerSound} type="audio/mp3" />
      </audio>

      <div ref={mapContainer} className="w-full h-screen" />

      <div className='fixed top-6 md:top-3 left-6 md:left-3 right-0 flex gap-2 justify-start items-start pointer-events-none'>
        {!loadingScreen && alertGempaBumi &&
          <Card title={
            <div className='overflow-hidden'>
              <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
              <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                <p className='p-1 bg-black font-bold text-xs text-glow'>GEMPA BUMI</p>
              </div>
            </div>
          } className='hidden md:block show-pop-up   md:left-6 md:w-1/3 lg:w-1/4 xl:w-1/5 2xl:w-1/6'>
            <div className='flex flex-col w-full justify-center items-center text-glow text-sm ' style={{
              fontSize: "10px"
            }}>
              <div className='w-full flex   gap-2' >
                <div>
                  <div id="internal" className="label bordered flex mb-2 w-full lg:w-32">
                    <div className="flex flex-col items-center p-1 ">
                      <div className="text -characters">{alertGempaBumi.readableMag}</div>
                      <div className="text">MAG</div>
                    </div>
                    <div className="decal -blink -striped"></div>
                  </div>
                  <p className='text-glow font-bold'>DEPTH : {alertGempaBumi.readableDepth} KM</p>
                </div>
                <div className="bordered p-2 w-full">
                  <table className='w-full'>
                    <tbody>

                      <tr>
                        <td className='text-left'>TIME</td>
                        <td className='text-right'>{alertGempaBumi.readableTime} WIB</td>
                      </tr>
                      <tr>
                        <td className='text-left'>MAG</td>
                        <td className='text-right'>{alertGempaBumi.mag}</td>
                      </tr>
                      <tr>
                        <td className='text-left'>DEPTH</td>
                        <td className='text-right'>{alertGempaBumi.depth}</td>
                      </tr>
                      <tr>
                        <td className='text-left'>LAT</td>
                        <td className='text-right'>{alertGempaBumi.infoGempa.lat}</td>
                      </tr>
                      <tr>
                        <td className='text-left'>LNG</td>
                        <td className='text-right'>{alertGempaBumi.infoGempa.lng}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>
              <div className='mt-2 bordered w-full'>
                <p className='text-glow p-2 break-words'>{alertGempaBumi.infoGempa.message}</p>
              </div>
            </div>
            {alertGempaBumi.mag >= 5 && <div className='red-bordered p-2 overflow-y-auto custom-scrollbar mt-2  pointer-events-auto' style={{
              maxHeight: "20vh",
            }}>
              <ul>
                {alertGempaBumi.infoGempa.listKotaTerdampak && alertGempaBumi.infoGempa.listKotaTerdampak.map((kota, i) => {
                  if (kota.hit) {
                    return <li key={i} className='flex flex-grow justify-between items-center mb-2 item-daerah danger slide-in-left'>
                      <ItemKotaTerdampak kota={kota} />
                    </li>
                  } else {
                    return <li key={i} className='flex flex-grow justify-between items-center mb-2 item-daerah slide-in-left'>
                      <ItemKotaTerdampak kota={kota} />
                    </li>
                  }
                })}
              </ul>
            </div>}
          </Card>}

        {!loadingScreen && infoTsunami &&
          <Card title={
            <div className='overflow-hidden'>
              <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
              <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                <p className='p-1 bg-black font-bold text-xs text-glow'>PERINGATAN TSUNAMI</p>
              </div>
            </div>
          }
            footer={
              <div className='flex justify-center w-full' >
                <span >{infoTsunami.infoTsunami.level}</span>
              </div>
            }
            className='hidden md:block show-pop-up   md:w-1/3 lg:w-1/4 xl:w-1/5 2xl:w-1/6'>
            <div className='flex flex-col w-full justify-center items-center text-glow text-sm ' style={{
              fontSize: "10px"
            }}>

              <div className='mt-2 bordered w-full'>
                <p className='text-glow p-2 break-words'>{infoTsunami.infoTsunami.message}</p>
              </div>
            </div>
            {(infoTsunami.infoTsunami.level?.includes("PD-1") || infoTsunami.infoTsunami.level?.includes("PD-2")) && <div className='red-bordered p-2 overflow-y-auto custom-scrollbar mt-2 pointer-events-auto' style={{
              maxHeight: "20vh",
            }}>
              <ul>
                {infoTsunami.infoTsunami.listKotaTerdampak && infoTsunami.infoTsunami.listKotaTerdampak.map((kota, i) => {
                  return <li key={i} className='flex flex-grow justify-between items-center mb-2 item-daerah slide-in-left'>
                    <ItemKotaTerdampak kota={kota} />
                  </li>
                })}
              </ul>
            </div>}
          </Card>}


      </div>




      <div className='fixed  top-12 w-28 md:bottom-auto md:top-2 left-0 right-0 m-auto flex flex-col justify-center items-center gap-2'>
        <button className=' bordered w-24 text-sm text-center bg-black cursor-pointer' onClick={() => {
          testDemoGempa();
        }}>
          TEST GEMPA
        </button>

        <button className=' bordered w-28 text-sm text-center bg-black cursor-pointer' onClick={() => {
          testDemoTsunami();
        }}>
          TEST TSUNAMI
        </button>
      </div>



      {!loadingScreen && <Card title={
        <p className='font-bold text-glow-red text-sm text-center' style={{
          color: "red"
        }}>EVENT LOG</p>
      } className=' fixed right-0  md:right-6 top-1 md:top-6 card-float md:w-1/3 lg:w-1/5 show-pop-up'>
        <ul >
          {events.map((v: TitikGempa, i) => {

            return <li key={i}
              onClick={() => {
                selectEvent(v.infoGempa);

              }}
              className='flex flex-col mb-2 list-event cursor-pointer  slide-in-left' style={{
                animationDelay: `${i * 0.01}s`,
                transform: 'translateX(-110%)'
              }}>
              <span className='block mb-1' style={{
                fontSize: "11px"
              }}>{v.infoGempa.time} WIB</span>
              <div className=' bordered p-2 overflow-hidden' style={{
                fontSize: "12px"
              }}>
                {v.readableMag} M - {v.infoGempa.place || "uknown"}
              </div>
            </li>
          })}
        </ul>

      </Card>}







      <div className='fixed bottom-6 left-6 md:right-0 md:left-3 flex gap-2 justify-start items-end pointer-events-none'>
        {!loadingScreen && gempaDirasakan && <Card title={
          <div className='w-full flex justify-center text-center '>
            <p className='font-bold text-glow-red text-sm '>
              GEMPA DIRASAKAN TERAKHIR
            </p>

          </div>
        }
          footer={
            <div className='flex justify-center w-full cursor-pointer' onClick={() => {
              selectEvent(gempaDirasakan.infoGempa);
            }}>
              <span ><IoLocationSharp /></span>
            </div>
          }

          className='hidden md:block show-pop-up  md:w-1/3 lg:w-2/5 xl:w-1/5 pointer-events-auto'>
          <div className='flex flex-col w-full justify-center items-center text-glow text-sm ' style={{
            fontSize: "10px"
          }}>
            <div className='w-full flex flex-col lg:flex-row   gap-2' >
              <div>
                <div id="internal" className="label bordered flex justify-between mb-2 w-full lg:w-32">
                  <div className="flex flex-col items-center p-1 ">
                    <div className="text -characters">{gempaDirasakan.readableMag}</div>
                    <div className="text">MAG</div>
                  </div>
                  <div className="decal -blink -striped"></div>
                </div>
                <p className='text-glow font-bold'>DEPTH : {gempaDirasakan.readableDepth} KM</p>
              </div>
              <div className="bordered p-2 w-full">
                <table className='w-full'>
                  <tbody>

                    <tr className=' p-0'>
                      <td className='text-left p-0'>TIME</td>
                      <td className='text-right p-0'>{gempaDirasakan.infoGempa.time} WIB</td>
                    </tr>
                    <tr className=' p-0'>
                      <td className='text-left p-0'>MAG</td>
                      <td className='text-right p-0'>{gempaDirasakan.infoGempa.mag}</td>
                    </tr>
                    <tr className=' p-0'>
                      <td className='text-left p-0'>DEPTH</td>
                      <td className='text-right p-0'>{gempaDirasakan.infoGempa.depth}</td>
                    </tr>
                    <tr className=' p-0'>
                      <td className='text-left p-0'>LAT</td>
                      <td className='text-right p-0'>{gempaDirasakan.infoGempa.lat}</td>
                    </tr>
                    <tr className=' p-0'>
                      <td className='text-left p-0'>LNG</td>
                      <td className='text-right p-0'>{gempaDirasakan.infoGempa.lng}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
            <div className='mt-2 bordered'>
              <p className='text-glow p-2 break-words'>{gempaDirasakan.infoGempa.message}</p>
            </div>
          </div>
        </Card>}

        {!loadingScreen && gempaTerakhir && <Card title={
          <div className='w-full flex justify-center text-center'>
            <p className='font-bold text-glow-red text-sm '>
              GEMPA TERDETEKSI TERAKHIR
            </p>

          </div>
        }
          footer={
            <div className='flex justify-center w-full  cursor-pointer' onClick={() => {
              selectEvent(gempaTerakhir.infoGempa);
            }}>
              <span ><IoLocationSharp /></span>
            </div>
          }

          className='hidden md:block show-pop-up  md:w-1/4 lg:w-1/6 pointer-events-auto'>
          <div className='text-glow text-sm w-full ' style={{
            fontSize: "10px"
          }}>
            <table className='w-full'>
              <tbody>
                <tr>
                  <td className='text-left'>PLACE</td>
                  <td className='text-right'>{gempaTerakhir.infoGempa.place}</td>
                </tr>
                <tr>
                  <td className='text-left'>TIME</td>
                  <td className='text-right' >{gempaTerakhir.readableTime} WIB</td>
                </tr>
                <tr>
                  <td className='text-left'>MAG</td>
                  <td className='text-right'>{gempaTerakhir.infoGempa.mag}</td>
                </tr>
                <tr>
                  <td className='text-left'>DEPTH</td>
                  <td className='text-right'>{gempaTerakhir.readableDepth} KM</td>
                </tr>
                <tr>
                  <td className='text-left'>LAT</td>
                  <td className='text-right'>{gempaTerakhir.infoGempa.lat}</td>
                </tr>
                <tr>
                  <td className='text-left'>LNG</td>
                  <td className='text-right'>{gempaTerakhir.infoGempa.lng}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>}
      </div>

      <div className='right-6 bottom-6 md:bottom-3 md:right-3 fixed  pointer-events-none flex gap-2 justify-end items-end'>


        {!loadingScreen && detailInfoGempa && <Card title={
          <div className='w-full flex justify-between'>
            <p className='font-bold text-glow-red text-sm'>
              DETAIL EVENT
            </p>
            <button onClick={() => {
              if (selectedPopup.current) {
                selectedPopup.current.remove();
              }
              setDetailInfoGempa(null);
            }}>X</button>
          </div>
        }
          className='  show-pop-up pointer-events-auto'>
          <div className='text-glow text-sm w-full ' style={{
            fontSize: "10px"
          }}>
            <div className='flex flex-col w-full gap-2'>
              {/* {detailInfoGempa.mmi != 0 && <img src={"https://bmkg-content-inatews.storage.googleapis.com/" + (detailInfoGempa.mmi) + ".mmi.jpg"} alt="" className='w-52' />} */}

              <div>
                <div className='bordered p-2'>
                  <table className='w-full'>
                    <tbody>
                      <tr>
                        <td className='text-left flex'>PLACE</td>
                        <td className='text-right break-words pl-2'>{detailInfoGempa.place}</td>
                      </tr>
                      <tr>
                        <td className='text-left flex'>TIME</td>
                        <td className='text-right break-words pl-2' data-time={detailInfoGempa.time}>{detailInfoGempa.time} WIB</td>
                      </tr>
                      <tr>
                        <td className='text-left flex'>MAG</td>
                        <td className='text-right break-words pl-2'>{detailInfoGempa.mag}</td>
                      </tr>
                      <tr>
                        <td className='text-left flex'>DEPTH</td>
                        <td className='text-right break-words pl-2'>{parseFloat(detailInfoGempa.depth.replace(" Km", "")).toFixed(2)} KM</td>
                      </tr>
                      <tr>
                        <td className='text-left flex'>LAT</td>
                        <td className='text-right break-words pl-2'>{detailInfoGempa.lat}</td>
                      </tr>
                      <tr>
                        <td className='text-left flex'>LNG</td>
                        <td className='text-right break-words pl-2'>{detailInfoGempa.lng}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className='bordered p-2 overflow-y-auto max-h-60'>
                <table id='histori_tabel' style={{
                  fontSize: "10px"
                }} className='w-full text-right '>
                  <thead>
                    <tr>
                      <th className='p-1'>
                        Time(UTC)
                      </th>
                      <th className='p-1'>
                        +OT(min)
                      </th>
                      <th className='p-1'>
                        Lat
                      </th>
                      <th className='p-1'>
                        Lng
                      </th>
                      <th className='p-1'>
                        Depth
                      </th>
                      <th className='p-1'>
                        Phase
                      </th>
                      <th className='p-1'>
                        MagType
                      </th>
                      <th className='p-1'>
                        Mag
                      </th>
                      <th className='p-1'>
                        MagCount
                      </th>
                      <th className='p-1'>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </Card>}
        {shakeMap &&
          <Card title={
            <div className='w-full flex justify-between'>
              <p className='font-bold text-glow-red text-sm'>
                SHAKEMAP
              </p>
              <button onClick={() => {
                setShakeMap(null);
              }}>X</button>
            </div>
          }
            className='  show-pop-up pointer-events-auto'
          >
            <a href={"https://bmkg-content-inatews.storage.googleapis.com/" + shakeMap} target='_blank'>
            <img src={"https://bmkg-content-inatews.storage.googleapis.com/" + shakeMap} alt="" width={300} style={{ filter: "invert(1)" }} />
            </a>
          </Card>}

      </div>



      {!loadingScreen && alertGempaBumi && gempaDirasakan && <Card title={
        <div className='overflow-hidden'>
          <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
          <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
            <p className='p-1 bg-black font-bold text-xs text-glow'>GEMPA BUMI</p>
          </div>
        </div>
      } className='block md:hidden show-pop-up  fixed bottom-10 md:top-6 left-0 card-warning right-0 md:left-6 md:w-1/4 lg:w-1/5'>
        <div className='flex flex-col w-full justify-center items-center text-glow text-sm ' style={{
          fontSize: "10px"
        }}>
          <div className='w-full flex   gap-2' >
            <div>
              <div id="internal" className="label bordered flex mb-2 w-full lg:w-32">
                <div className="flex flex-col items-center p-1 ">
                  <div className="text -characters">{gempaDirasakan.readableMag}</div>
                  <div className="text">MAG</div>
                </div>
                <div className="decal -blink -striped"></div>
              </div>
              <p className='text-glow font-bold'>DEPTH : {gempaDirasakan.readableDepth} KM</p>
            </div>
            <div className="bordered p-2 w-full">
              <table className='w-full'>
                <tbody>

                  <tr>
                    <td className='text-left'>TIME</td>
                    <td className='text-right'>{gempaDirasakan.infoGempa.time} WIB</td>
                  </tr>
                  <tr>
                    <td className='text-left'>MAG</td>
                    <td className='text-right'>{gempaDirasakan.infoGempa.mag}</td>
                  </tr>
                  <tr>
                    <td className='text-left'>DEPTH</td>
                    <td className='text-right'>{gempaDirasakan.infoGempa.depth}</td>
                  </tr>
                  <tr>
                    <td className='text-left'>LAT</td>
                    <td className='text-right'>{gempaDirasakan.infoGempa.lat}</td>
                  </tr>
                  <tr>
                    <td className='text-left'>LNG</td>
                    <td className='text-right'>{gempaDirasakan.infoGempa.lng}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
          <div className='mt-2 bordered'>
            <p className='text-glow p-2 break-words'>{gempaDirasakan.infoGempa.message}</p>
          </div>
        </div>

      </Card>}

      {!loadingScreen && alertGempaBumis.map((v, i) => {
        return <div className='z-50' key={i}>
          <GempaBumiAlert
            key={i}
            props={
              {
                magnitudo: v.mag || 9.0,
                kedalaman: v.depth || '0 km',
                show: true,
                closeInSecond: 6
              }
            } />
        </div>
      })}

      {/* {!loadingScreen && alertGempaBumi && <GempaBumiAlert key={alertGempaBumi.id}
            props={
              {
                magnitudo: alertGempaBumi.mag || 9.0,
                kedalaman: alertGempaBumi.depth || '0 km',
                show: true,
                closeInSecond: 6
              }
            } />} */}


      <div className="fixed bottom-2 md:bottom-1 m-auto right-0 md:right-72 left-0 md:left-auto flex justify-center items-center gap-2 w-36  md:w-auto">
        <a title="Link Github" href="https://inatews.bmkg.go.id" className='flex gap-1 text-center justify-center  m-auto'>
          <div className='bmkg-icon'></div>
          <span>BMKG</span>
        </a>
        <a title="Link Github" href="https://github.com/bagusindrayana/ews-concept" className='flex gap-1 text-center justify-center  m-auto'>
          <div className='github-icon'></div>
          <span>Github</span>
        </a>

      </div>

      {!loadingScreen && alertTsunami && <div className='fixed m-auto top-0 left-0 right-0 bottom-0 flex justify-center' id="tsunami-warning">

        <div className='w-full h-full absolute -rotate-90'>
          <div className="main " id='bg-tsunami'>
            <div className="hex-bg">
              {generateDiv(window.screen.width + (window.screen.width / 3))}

            </div>
          </div>
        </div>

        <div className='w-full flex flex-col items-center justify-center '>
          <div className='warning scale-75 md:scale-150 flex flex-col justify-center items-center'>
            <div className='long-hex flex flex-col justify-center opacity-0 show-pop-up animation-delay-1'>
              <div className="flex justify-evenly w-full items-center">
                <div className='warning-black opacity-0 blink animation-fast animation-delay-2'></div>
                <div className='flex flex-col font-bold text-center text-black'>
                  <span className='text-xl'>TSUNAMI</span>
                  <span className='text-xs'>Peringatan Dini Tsunami</span>
                </div>
                <div className='warning-black opacity-0 blink animation-fast animation-delay-2'></div>
              </div>
            </div>
            <div className=' w-3/4 overflow-hidden bg-black relative rounded flex justify-center items-center opacity-0 show-pop-up animation-delay-2'>

              <div className='absolute w-full h-2 m-auto top-0 left-0 right-0 overflow-hidden'>
                <div className='w-2 h-full strip-bar-red strip-animation'></div>
              </div>
              <div className='absolute w-full h-2 m-auto bottom-0 left-0 right-0 overflow-hidden'>
                <div className='w-2 h-full strip-bar-red strip-animation-reverse'></div>
              </div>
              <div className='absolute w-2 h-full m-auto top-0 bottom-0 left-0 overflow-hidden'>
                <div className='w-2 h-full strip-bar-red-vertical strip-animation-vertical-reverse'></div>

              </div>

              <div className='absolute w-2 h-full m-auto top-0 bottom-0 right-0 overflow-hidden'>
                <div className='w-2 h-full strip-bar-red-vertical strip-animation-vertical'></div>

              </div>
              <div className='w-full h-full p-6'>
                <div className="red-bordered p-2 text-center w-full mb-2">
                  <div className='overflow-hidden relative'>
                    <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
                    <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                      <p className='p-1 bg-black font-bold text-xs text-glow'>POTENSI TSUNAMI</p>
                    </div>
                  </div>
                </div>
                <Card title={
                  <div className='overflow-hidden relative'>
                    <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
                    <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                      <p className='p-1 bg-black font-bold text-xs text-glow uppercase'>{alertTsunami.infoTsunami.level}</p>
                    </div>
                  </div>
                }
                  className='w-full h-auto'>
                  <p className='text-xs'>
                    {alertTsunami.infoTsunami.message}
                  </p>
                </Card>
              </div>

            </div>
          </div>



        </div>
        <div className='absolute top-0 bottom-0 left-0 right-0 '>
          <div className='z-20 absolute top-8 left-8 md:top-28 md:left-28 scale-150'>
            <div className='p-1 bg-black rounded-xl opacity-0 show-pop-up animation-delay-2'>
              <div className='p-1 red-bordered'>
                <div className="warning-tsunami-yellow"></div>
              </div>
            </div>
          </div>

          <div className='z-20 absolute bottom-8 left-8 md:bottom-28 md:left-28 scale-150'>
            <div className='p-1 bg-black rounded-xl opacity-0 show-pop-up' style={{
              animationDelay: "2.5s"
            }}>
              <div className='p-1 red-bordered'>
                <div className="warning-tsunami-yellow"></div>
              </div>
            </div>
          </div>

          <div className='z-20 absolute top-8 right-8 md:top-28 md:right-28 scale-150'>
            <div className='p-1 bg-black rounded-xl opacity-0 show-pop-up' style={{
              animationDelay: "3s"
            }}>
              <div className='p-1 red-bordered'>
                <div className="warning-tsunami-yellow"></div>
              </div>
            </div>
          </div>


          <div className='z-20 absolute bottom-8 right-8 md:bottom-28 md:right-28 scale-150'>
            <div className='p-1 bg-black rounded-xl opacity-0 show-pop-up' style={{
              animationDelay: "3.5s"
            }}>
              <div className='p-1 red-bordered'>
                <div className="warning-tsunami-yellow"></div>
              </div>
            </div>
          </div>

          <div className='z-20 absolute h-28 m-auto bottom-0 top-0 right-16 md:right-1/4 hidden md:block scale-150'>
            <div className='p-1 bg-black rounded-xl opacity-0 show-pop-up' style={{
              animationDelay: "2s"
            }}>
              <div className='p-1 red-bordered'>
                <div className="warning-tsunami-yellow"></div>
              </div>
            </div>
          </div>

          <div className='z-20 absolute h-28 m-auto bottom-0 top-0 left-16 md:left-1/4 hidden md:block scale-150'>
            <div className='p-1 bg-black rounded-xl opacity-0 show-pop-up del' style={{
              animationDelay: "2.5s"
            }}>
              <div className='p-1 red-bordered'>
                <div className="warning-tsunami-yellow "></div>
              </div>
            </div>
          </div>



        </div>



      </div>}


      <div className='fixed m-auto top-0 bottom-0 left-0 right-0 flex flex-col justify-center items-center overlay-bg text-center' id='loading-screen'>
        <span className="loader"></span>
        <p className='my-2 red-color p-2'>INI MERUPAKAN DESAIN KONSEP - DATA GEMPA DARI BMKG</p>
      </div>

    </div>

  );
}
