interface mapPoint {
    serialNumber: string;
    station: string;
    installationDate: string; // Date of installation in ISO format
    model: string; // Model of the device
    brand: string; // Brand of the device
    status: "green" | "red" | "yellow"; // Status del sensor
    gps: [number, number]; // [lng, lat]
}


export type { mapPoint };
