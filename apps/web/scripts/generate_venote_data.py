import csv
import uuid
from faker import Faker
from datetime import datetime, timedelta
import random

fake = Faker()

def load_client_ids(filename="clients.csv"):
    with open(filename, newline='', encoding='utf-8') as csvfile:
        return [row[0] for idx, row in enumerate(csv.reader(csvfile)) if idx != 0]  # skip header

def generate_client_vehicle_note(client_id):
    return [
        str(uuid.uuid4()),
        client_id,
        fake.date_between(start_date="-2y", end_date="today").isoformat(),
        fake.paragraph(nb_sentences=3),
        datetime.now().isoformat(),
        datetime.now().isoformat()
    ]

def generate_vehicle_notes_csv(filename="client_vehicle_notes.csv", client_ids=None, notes_per_client=(1, 3)):
    if client_ids is None:
        client_ids = load_client_ids()

    headers = ["id", "clientId", "date", "note", "createdAt", "updatedAt"]
    
    with open(filename, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(headers)
        total_notes = 0
        for client_id in client_ids:
            for _ in range(random.randint(*notes_per_client)):
                writer.writerow(generate_client_vehicle_note(client_id))
                total_notes += 1

    print(f"{total_notes} vehicle notes written to {filename}")

# If run standalone
if __name__ == "__main__":
    client_ids = load_client_ids("clients.csv")
    generate_vehicle_notes_csv("client_vehicle_notes.csv", client_ids)
