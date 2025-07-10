function formatTime() {
    const now = new Date();
    const date = now.toLocaleDateString("en-GB");
    const time = now.toLocaleTimeString("en-GB");
    return { date, time };
}

function createCard(patient, date, time) {
    const isList = document.getElementById('container').classList.contains('list-view');

    if (isList) {
        return `
        <div class="card item">
            <div>${patient.name}</div>
            <div><em>${date}<br>${time}</em></div>
            <div>${patient.age}</div>
            <div>${patient.gender}</div>
            <div>${patient.height}/${patient.weight}</div>
            <div>${patient.nibp}</div>
            <div>${patient.pr}</div>
            <div>${patient.spo2}</div>
            <div>${patient.tempC} / ${patient.tempF}</div>
            <div>${patient.status}</div>
            <div><button class="update-btn">Manual Update</button></div>
        </div>`;
    } else {
        return `
        <div class="card item">
            <div class="card-header">
            <span>Name: ${patient.name}</span>
            <span>Age: ${patient.age}</span>
            </div>
            <div class="card-body">
            <div class="left">
                <div class="avatar"></div>
                <div class="last-updated"><em>Latest Updated:<br>${date}<br>${time}</em></div>
            </div>
            <div class="right">
                <div class="dept-room">Department: — Room No.: —</div>
                <div class="info">
                <p>Height: ${patient.height}cm &nbsp;&nbsp; Weight: ${patient.weight}kg &nbsp;&nbsp; Status: ${patient.status}</p>
                <p>NIBP: ${patient.nibp} mmHg</p>
                <p>Pulse Rate: ${patient.pr} bpm</p>
                <p>SpO<sub>2</sub>: ${patient.spo2}%</p>
                <p>Temperature: ${patient.tempC}°C / ${patient.tempF}°F</p>
                </div>
                <button class="update-btn">Manual Update</button>
            </div>
            </div>
        </div>`;
    }
}

function renderPatients(patients) {
    const container = document.getElementById("container");
    const { date, time } = formatTime();
    container.innerHTML = patients.map(patient => createCard(patient, date, time)).join('');
}

function setView(viewType) {
    const container = document.getElementById('container');
    const header = document.getElementById('header-row');
    container.classList.remove('grid-view', 'list-view');
    container.classList.add(`${viewType}-view`);
    header.style.display = viewType === 'list' ? 'grid' : 'none';
    loadAndRenderPatients(); // re-render
}

function loadAndRenderPatients() {
    fetch("patients.json")
        .then(res => res.json())
        .then(data => renderPatients(data))
        .catch(err => console.error("Error loading patients:", err));
}

window.onload = () => {
    setView('grid'); // default
    loadAndRenderPatients();
    setInterval(loadAndRenderPatients, 60000); // refresh every minute
};