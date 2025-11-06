"""
Fake US Contact Information Generator
Generates realistic fake customer data including:
- Names (First, Last)
- Gmail email addresses
- US phone numbers
- Addresses (US only)
- Additional demographic info
"""

import random
import json
import csv
from datetime import datetime, timedelta

class ContactGenerator:
    def __init__(self):
        self.first_names_male = [
            "James", "John", "Robert", "Michael", "William", "David", "Richard",
            "Joseph", "Thomas", "Charles", "Christopher", "Daniel", "Matthew",
            "Anthony", "Mark", "Donald", "Steven", "Andrew", "Paul", "Joshua",
            "Kenneth", "Kevin", "Brian", "George", "Timothy", "Ronald", "Edward",
            "Jason", "Jeffrey", "Ryan", "Jacob", "Nicholas", "Eric", "Jonathan",
            "Stephen", "Larry", "Justin", "Scott", "Brandon", "Benjamin", "Samuel",
            "Raymond", "Gregory", "Alexander", "Patrick", "Frank", "Dennis", "Jerry",
            "Tyler", "Aaron", "Jose", "Adam", "Nathan", "Douglas", "Zachary"
        ]
        
        self.first_names_female = [
            "Mary", "Patricia", "Jennifer", "Linda", "Barbara", "Elizabeth",
            "Susan", "Jessica", "Sarah", "Karen", "Lisa", "Nancy", "Betty",
            "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna",
            "Michelle", "Carol", "Amanda", "Dorothy", "Melissa", "Deborah",
            "Stephanie", "Rebecca", "Sharon", "Laura", "Cynthia", "Kathleen",
            "Amy", "Angela", "Shirley", "Anna", "Brenda", "Pamela", "Emma",
            "Nicole", "Helen", "Samantha", "Katherine", "Christine", "Debra",
            "Rachel", "Carolyn", "Janet", "Catherine", "Maria", "Heather",
            "Diane", "Ruth", "Julie", "Olivia", "Joyce", "Virginia", "Victoria"
        ]
        
        self.last_names = [
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
            "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
            "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
            "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
            "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
            "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green",
            "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
            "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz",
            "Parker", "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris",
            "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan",
            "Cooper", "Peterson", "Bailey", "Reed", "Kelly", "Howard", "Ramos",
            "Kim", "Cox", "Ward", "Richardson", "Watson", "Brooks", "Chavez",
            "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes",
            "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long"
        ]
        
        self.street_names = [
            "Main Street", "Oak Avenue", "Maple Drive", "Park Road", "Cedar Lane",
            "Washington Street", "Lake View Drive", "Hill Road", "Pine Street",
            "Elm Avenue", "Sunset Boulevard", "First Avenue", "Second Street",
            "Third Avenue", "Park Avenue", "Madison Avenue", "Jefferson Street",
            "Lincoln Avenue", "Spring Street", "Church Street", "Market Street",
            "Walnut Street", "Highland Avenue", "River Road", "Valley Drive",
            "Summit Avenue", "Forest Drive", "Meadow Lane", "Ridge Road",
            "Garden Street", "Birch Lane", "Cherry Street", "Chestnut Street",
            "Grove Avenue", "Willow Drive", "Dogwood Lane", "Colonial Drive",
            "Heritage Way", "Liberty Street", "Union Street", "Central Avenue",
            "College Avenue", "State Street", "Mill Road", "School Street"
        ]
        
        self.cities_states = [
            ("New York", "NY"), ("Los Angeles", "CA"), ("Chicago", "IL"),
            ("Houston", "TX"), ("Phoenix", "AZ"), ("Philadelphia", "PA"),
            ("San Antonio", "TX"), ("San Diego", "CA"), ("Dallas", "TX"),
            ("San Jose", "CA"), ("Austin", "TX"), ("Jacksonville", "FL"),
            ("Fort Worth", "TX"), ("Columbus", "OH"), ("Charlotte", "NC"),
            ("San Francisco", "CA"), ("Indianapolis", "IN"), ("Seattle", "WA"),
            ("Denver", "CO"), ("Boston", "MA"), ("Nashville", "TN"),
            ("Detroit", "MI"), ("Portland", "OR"), ("Las Vegas", "NV"),
            ("Memphis", "TN"), ("Louisville", "KY"), ("Baltimore", "MD"),
            ("Milwaukee", "WI"), ("Albuquerque", "NM"), ("Tucson", "AZ"),
            ("Fresno", "CA"), ("Mesa", "AZ"), ("Sacramento", "CA"),
            ("Atlanta", "GA"), ("Kansas City", "MO"), ("Colorado Springs", "CO"),
            ("Raleigh", "NC"), ("Miami", "FL"), ("Long Beach", "CA"),
            ("Virginia Beach", "VA"), ("Oakland", "CA"), ("Minneapolis", "MN"),
            ("Tampa", "FL"), ("Arlington", "TX"), ("Bakersfield", "CA"),
            ("Aurora", "CO"), ("Anaheim", "CA"), ("Santa Ana", "CA"),
            ("Riverside", "CA"), ("Corpus Christi", "TX")
        ]

    def generate_gmail(self, first_name, last_name, birth_year):
        """Generate a realistic Gmail address"""
        # Various Gmail patterns
        patterns = [
            f"{first_name.lower()}.{last_name.lower()}",
            f"{first_name.lower()}{last_name.lower()}",
            f"{first_name.lower()}{last_name[0].lower()}",
            f"{first_name[0].lower()}{last_name.lower()}",
            f"{first_name.lower()}.{last_name.lower()}{random.randint(1, 99)}",
            f"{first_name.lower()}{last_name.lower()}{birth_year % 100}",
            f"{first_name.lower()}_{last_name.lower()}",
            f"{first_name.lower()}{random.randint(100, 999)}",
        ]
        
        email = random.choice(patterns)
        return f"{email}@gmail.com"

    def generate_phone(self):
        """Generate a realistic US phone number"""
        # US area codes (sampling of real area codes)
        area_codes = [
            "212", "213", "214", "215", "216", "217", "218", "219",
            "224", "225", "228", "229", "231", "234", "239", "240",
            "248", "251", "252", "253", "254", "256", "260", "262",
            "267", "269", "270", "276", "281", "301", "302", "303",
            "304", "305", "307", "308", "309", "310", "312", "313",
            "314", "315", "316", "317", "318", "319", "320", "321",
            "323", "330", "331", "334", "336", "337", "339", "347",
            "351", "352", "360", "361", "386", "401", "402", "404",
            "405", "406", "407", "408", "409", "410", "412", "413",
            "414", "415", "417", "419", "423", "424", "425", "430",
            "432", "434", "435", "440", "442", "443", "458", "469",
            "470", "475", "478", "479", "480", "484", "501", "502",
            "503", "504", "505", "507", "508", "509", "510", "512",
            "513", "515", "516", "517", "518", "520", "530", "540",
            "541", "551", "559", "561", "562", "563", "567", "570",
            "571", "573", "574", "575", "580", "585", "586", "601",
            "602", "603", "605", "606", "607", "608", "609", "610",
            "612", "614", "615", "616", "617", "618", "619", "620",
            "623", "626", "630", "631", "636", "641", "646", "650",
            "651", "657", "660", "661", "662", "667", "678", "682",
            "701", "702", "703", "704", "706", "707", "708", "712",
            "713", "714", "715", "716", "717", "718", "719", "720",
            "724", "727", "732", "734", "737", "740", "747", "754",
            "757", "760", "763", "765", "770", "772", "773", "774",
            "775", "781", "785", "786", "801", "802", "803", "804",
            "805", "806", "808", "810", "812", "813", "814", "815",
            "816", "817", "818", "828", "830", "831", "832", "843",
            "845", "847", "848", "850", "856", "857", "858", "859",
            "860", "862", "863", "864", "865", "870", "872", "878",
            "901", "903", "904", "906", "907", "908", "909", "910",
            "912", "913", "914", "915", "916", "917", "918", "919",
            "920", "925", "928", "929", "931", "936", "937", "940",
            "941", "947", "949", "951", "952", "954", "956", "959",
            "970", "971", "972", "973", "978", "979", "980", "984"
        ]
        
        area_code = random.choice(area_codes)
        exchange = random.randint(200, 999)  # Exchange code (2-9 for first digit)
        number = random.randint(1000, 9999)
        
        return f"({area_code}) {exchange}-{number}"

    def generate_birth_date(self, min_age=18, max_age=75):
        """Generate a realistic birth date"""
        today = datetime.now()
        years_ago = random.randint(min_age, max_age)
        days_ago = random.randint(0, 365)
        
        birth_date = today - timedelta(days=years_ago*365 + days_ago)
        return birth_date.strftime("%Y-%m-%d")

    def generate_contact(self):
        """Generate a single fake contact"""
        # Randomly select gender
        gender = random.choice(["M", "F"])
        
        if gender == "M":
            first_name = random.choice(self.first_names_male)
        else:
            first_name = random.choice(self.first_names_female)
        
        last_name = random.choice(self.last_names)
        
        # Generate birth year for email
        birth_date = self.generate_birth_date()
        birth_year = int(birth_date.split("-")[0])
        
        # Generate address
        street_number = random.randint(100, 9999)
        street_name = random.choice(self.street_names)
        
        # Add apartment/unit number 30% of the time
        if random.random() < 0.3:
            apt_unit = f"Apt {random.randint(1, 999)}"
            street_address = f"{street_number} {street_name}, {apt_unit}"
        else:
            street_address = f"{street_number} {street_name}"
        
        city, state = random.choice(self.cities_states)
        zip_code = f"{random.randint(10000, 99999)}"
        
        contact = {
            "first_name": first_name,
            "last_name": last_name,
            "full_name": f"{first_name} {last_name}",
            "email": self.generate_gmail(first_name, last_name, birth_year),
            "phone": self.generate_phone(),
            "date_of_birth": birth_date,
            "age": datetime.now().year - birth_year,
            "gender": "Male" if gender == "M" else "Female",
            "street_address": street_address,
            "city": city,
            "state": state,
            "zip_code": zip_code,
            "full_address": f"{street_address}, {city}, {state} {zip_code}",
            "created_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return contact

    def generate_contacts(self, count=100):
        """Generate multiple fake contacts"""
        contacts = []
        for _ in range(count):
            contacts.append(self.generate_contact())
        return contacts

    def save_to_json(self, contacts, filename="fake_contacts.json"):
        """Save contacts to JSON file"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(contacts, f, indent=2, ensure_ascii=False)
        print(f"✓ Saved {len(contacts)} contacts to {filename}")

    def save_to_csv(self, contacts, filename="fake_contacts.csv"):
        """Save contacts to CSV file"""
        if not contacts:
            return
        
        keys = contacts[0].keys()
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(contacts)
        print(f"✓ Saved {len(contacts)} contacts to {filename}")

    def print_sample(self, contacts, count=5):
        """Print sample contacts"""
        print(f"\n{'='*80}")
        print(f"SAMPLE CONTACTS ({count} contacts)")
        print(f"{'='*80}\n")
        
        for i, contact in enumerate(contacts[:count], 1):
            print(f"Contact #{i}")
            print(f"Name: {contact['full_name']}")
            print(f"Email: {contact['email']}")
            print(f"Phone: {contact['phone']}")
            print(f"DOB: {contact['date_of_birth']} (Age: {contact['age']})")
            print(f"Gender: {contact['gender']}")
            print(f"Address: {contact['full_address']}")
            print(f"{'-'*80}\n")


def main():
    """Main function to run the generator"""
    print("=" * 80)
    print("FAKE US CONTACT INFORMATION GENERATOR")
    print("=" * 80)
    
    generator = ContactGenerator()
    
    # Generate contacts
    print("\nGenerating contacts...")
    contact_count = 200  # Change this number to generate more or fewer contacts
    contacts = generator.generate_contacts(contact_count)
    
    # Display sample
    generator.print_sample(contacts, count=5)
    
    # Save to files
    print("Saving contacts to files...")
    generator.save_to_json(contacts, "fake_contacts.json")
    generator.save_to_csv(contacts, "fake_contacts.csv")
    
    print(f"\n✓ Successfully generated {len(contacts)} fake contacts!")
    print("✓ Files created: fake_contacts.json, fake_contacts.csv")
    
    # Statistics
    print("\nContact Statistics:")
    genders = {}
    states = {}
    for contact in contacts:
        genders[contact['gender']] = genders.get(contact['gender'], 0) + 1
        states[contact['state']] = states.get(contact['state'], 0) + 1
    
    print(f"  Male: {genders.get('Male', 0)}")
    print(f"  Female: {genders.get('Female', 0)}")
    print(f"\nTop 5 States:")
    for state, count in sorted(states.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  {state}: {count} contacts")


if __name__ == "__main__":
    main()