import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as atlas from 'azure-maps-control';
import * as L from 'leaflet'; // Import Leaflet types

/// <reference types="@types/google.maps" />

interface AddressFields {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export class PcfMapFusion implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private mapContainer: HTMLDivElement;
  private map: google.maps.Map | atlas.Map | L.Map;
  private selectedLocation: string | undefined;
  private notifyOutputChanged: () => void;

  constructor() {
    // Empty constructor
  }

  public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
    this.mapContainer = document.createElement("div");
    this.mapContainer.style.width = "100%";
    this.mapContainer.style.height = "100%";
    container.appendChild(this.mapContainer);

    this.notifyOutputChanged = notifyOutputChanged;

    const mapType = context.parameters.MapType.raw;
    const addressFieldsJson = context.parameters.AddressFieldsJson.raw;
    const addressFields: AddressFields = JSON.parse(addressFieldsJson || "{}");

    switch (mapType) {
      case "Google": {
        const googleMapsApiKey = context.parameters.MapApiKey.raw;
        if (googleMapsApiKey) {
          this.loadGoogleMap(googleMapsApiKey, addressFields);
        } else {
          console.error("Google Maps API key is required");
        }
        break;
      }
      case "Bing": {
        const azureMapsApiKey = context.parameters.MapApiKey.raw;
        if (azureMapsApiKey) {
          this.loadAzureMap(azureMapsApiKey, addressFields);
        } else {
          console.error("Azure Maps API key is required");
        }
        break;
      }
      case "OpenStreetMap": {
        this.loadOpenStreetMap(addressFields);
        break;
      }
      default:
        console.error("Unknown map type");
    }
  }

  private loadGoogleMap(apiKey: string, addressFields: AddressFields) {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.onload = () => {
      const map = new google.maps.Map(this.mapContainer, {
        zoom: 8,
        center: { lat: -34.397, lng: 150.644 }
      });

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          this.selectedLocation = `${e.latLng.lat()},${e.latLng.lng()}`;
          this.notifyOutputChanged();
        }
      });

      this.map = map;
    };
    document.head.appendChild(script);
  }

  private loadAzureMap(apiKey: string, addressFields: AddressFields) {
    const script = document.createElement("script");
    script.src = "https://atlas.microsoft.com/sdk/js/atlas.min.js?api-version=2.0";
    script.onload = () => {
      const map = new atlas.Map(this.mapContainer, {
        center: [-34.397, 150.644],
        zoom: 8,
        authOptions: {
          authType: atlas.AuthenticationType.subscriptionKey,
          subscriptionKey: apiKey
        }
      });

      map.events.add('click', (e: atlas.MapMouseEvent) => {
        // e.position est un tableau [longitude, latitude]
        const position = e.position;
        if (position) {
          this.selectedLocation = `${position[1]},${position[0]}`; // latitude, longitude
          this.notifyOutputChanged();
        }
      });

      this.map = map;
    };
    document.head.appendChild(script);
  }

  private loadOpenStreetMap(addressFields: AddressFields) {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet/dist/leaflet.js";
    script.onload = () => {
      const map = new L.Map(this.mapContainer).setView([51.505, -0.09], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      map.on('click', (e: L.LeafletMouseEvent) => {
        this.selectedLocation = `${e.latlng.lat},${e.latlng.lng}`;
        this.notifyOutputChanged();
      });

      this.map = map;
    };
    document.head.appendChild(script);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    // Handle view updates here
  }

  public getOutputs(): IOutputs {
    return {
      SelectedLocation: this.selectedLocation
    };
  }

  public destroy(): void {
    // Cleanup when the control is removed
  }
}
