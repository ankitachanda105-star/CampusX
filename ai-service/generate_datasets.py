import os
import random
import pandas as pd
import numpy as np

# Set random seed for reproducibility
random.seed(42)
np.random.seed(42)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# LPU Master Departments & Blocks
DEPARTMENTS = {
    'Equipment': 'IT Services',
    'Network': 'IT Services',
    'Electrical': 'Maintenance/Electrical',
    'Plumbing': 'Maintenance/Electrical',
    'Cleanliness': 'Housekeeping',
    'Civil': 'Maintenance/Electrical',
    'Academic Labs': 'School of Computer Science & Engineering',
    'Hostel': 'Hostel Administration',
    'Academics': 'Examination Cell',
    'Security': 'Security',
    'Finance': 'Accounts/Finance',
}

LPU_BLOCKS = [
    'Block 32', 'Block 33', 'Block 34', 'Block 36', 'Block 38',
    'Block 55', 'Block 56', 'UniMall', 'Block 13 (Central Library)',
    'Block 25 (Auditorium & Administration)', 'Block 29 (Law & Management)'
]

LPU_HOSTELS = [f'BH-{i}' for i in range(1, 9)] + [f'GH-{i}' for i in range(1, 7)]

# ==========================================
# 1. GENERATE COMPLAINTS DATASET (220+ rows)
# ==========================================
def generate_complaints():
    complaint_templates = [
        # Network
        ('Network', 'Wi-Fi not connecting in Central Library', 'Student laptop unable to authenticate on LPU-Campus-WiFi on 2nd floor reading hall.', 'Block 13 (Central Library)', 'High', 120, 0),
        ('Network', 'Slow internet connectivity during online lab test', 'Bandwidth throttling and high ping causing test timeouts.', 'Block 34 - CSE Lab 02', 'High', 60, 0),
        ('Network', 'Hostel room LAN socket disconnected', 'RJ45 port pins are bent and ethernet cable does not lock in place.', 'BH-3 - Room 412', 'Medium', 2, 0),
        ('Network', 'Wi-Fi access point dead in corridor', 'The ceiling router shows no power LED and signal is completely absent.', 'GH-2 - 3rd Floor Wing A', 'High', 45, 0),
        ('Network', 'UMS portal unreachable over campus network', 'DNS resolution failing when trying to access the student dashboard portal.', 'Block 32 - Room 301', 'High', 70, 0),
        ('Network', 'Frequent packet drops on department switch', 'Intermittent disconnects on all wired terminals during class lecture.', 'Block 38 - Faculty Cabins', 'Medium', 15, 0),
        ('Network', 'Library e-resource database server timeout', 'Unable to fetch IEEE digital library journal articles from campus intranet.', 'Block 13 (Central Library)', 'Medium', 80, 0),
        ('Network', 'Campus Wi-Fi login page redirect loop', 'Captive portal keeps refreshing without presenting the student credential form.', 'UniMall - Food Court', 'Low', 150, 0),

        # Electrical
        ('Electrical', 'AC not cooling in 32-401 lecture theatre', 'Air conditioner blower runs but compressor does not cool; ambient temperature is above 38 degrees.', 'Block 32 - Room 401', 'High', 80, 0),
        ('Electrical', 'Burning smell and sparks from switchboard', 'Electrical short circuit sparking actively from the wall socket; hazardous condition.', 'Block 34 - Room 215', 'Critical', 60, 1),
        ('Electrical', 'Ceiling fan making loud grinding noise', 'Fan wobbles violently at speed 4 and 5; risk of detachment.', 'BH-1 - Room 204', 'High', 3, 1),
        ('Electrical', 'Fluorescent tube light flickering continuously', 'Blinking tube light in study room causing eye strain and headache.', 'GH-4 - Study Room', 'Low', 12, 0),
        ('Electrical', 'Power socket burnt and dead in lab bench', 'Plug point has black soot and does not deliver voltage to monitor.', 'Block 34 - CSE Lab 04', 'Medium', 40, 1),
        ('Electrical', 'Entire floor MCB tripped in hostel', 'Power outage across all rooms in wing B after overload.', 'BH-5 - 2nd Floor Wing B', 'High', 90, 0),
        ('Electrical', 'Exhaust fan stopped working in chemistry lab', 'Vapour extraction failure posing mild chemical inhalation concern.', 'Block 36 - Lab 102', 'Critical', 35, 1),
        ('Electrical', 'Outdoor floodlight off near hostel pathway', 'Dark stretch of walkway between Block 55 and BH-4 at night.', 'Block 55 - Pathway', 'High', 200, 0),

        # Equipment
        ('Equipment', 'Projector in CSE Lab 3 keeps restarting', 'EPSON projector shuts off after 5 minutes and red lamp warning LED blinks.', 'Block 34 - CSE Lab 03', 'High', 55, 0),
        ('Equipment', 'Wireless mic static noise in Seminar Hall 32', 'Audio receiver emits deafening screeching feedback during guest speech.', 'Block 32 - Acoustic Seminar Hall', 'High', 180, 0),
        ('Equipment', 'Computer system PC-501 blue screen on boot', 'Lab workstation displays kernel crash error and fails to boot into Windows/Linux.', 'Block 34 - CSE Lab 01', 'Medium', 1, 0),
        ('Equipment', 'HDMI wall port damaged in lecture room', 'Pins inside HDMI female receptacle are bent, preventing presentation projection.', 'Block 33 - Room 108', 'Medium', 65, 0),
        ('Equipment', 'Laser printer paper jam and roller squeak', 'Department printer crumples A4 sheets and displays error code E-04.', 'Block 25 - Admin Office', 'Low', 20, 0),
        ('Equipment', 'Auditorium stage motorized screen not descending', 'Remote control and wall switch fail to trigger the motorized projection canvas.', 'Block 25 (Auditorium)', 'High', 500, 0),
        ('Equipment', 'Smart interactive whiteboard touch calibration offset', 'Stylus registers clicks 5 inches to the left of contact point.', 'Block 38 - Smart Classroom', 'Medium', 45, 0),
        ('Equipment', 'Desktop keyboard missing spacebar in terminal 22', 'Keys missing on lab computer making coding assignment submission difficult.', 'Block 34 - CSE Lab 06', 'Low', 1, 0),

        # Plumbing
        ('Plumbing', 'Leaking tap in Boys Hostel Block 4 washroom', 'Water continuously flowing and splashing on floor, wasting gallons of water.', 'BH-4 - 1st Floor Washroom', 'Medium', 40, 0),
        ('Plumbing', 'Severely clogged toilet flush in Block 34', 'Water overflowing onto bathroom floor, unhygienic condition.', 'Block 34 - Ground Floor Restroom', 'Critical', 150, 1),
        ('Plumbing', 'Drinking water cooler filtration indicator red', 'Water taste is metallic and sediment filter light is flashing.', 'Block 32 - 2nd Floor Corridor', 'High', 100, 0),
        ('Plumbing', 'Geyser not heating water in girls hostel', 'Hot water supply inactive on top floor during cold winter morning.', 'GH-1 - 4th Floor Bathrooms', 'High', 50, 0),
        ('Plumbing', 'Overhead tank pipe leakage spraying onto staircase', 'PVC joint cracked on roof line dripping heavily into stairwell.', 'Block 36 - Staircase Landing', 'High', 80, 1),
        ('Plumbing', 'Washbasin drain pipe detached under counter', 'Grey water dumps directly onto floor when tap is opened.', 'BH-6 - Mess Handwash Station', 'Medium', 200, 0),
        ('Plumbing', 'Low water pressure on upper hostel floors', 'Taps producing only a trickle during morning peak hours (7:30 - 9:00 AM).', 'BH-2 - 5th Floor', 'High', 65, 0),
        ('Plumbing', 'Sewage odor emerging from ground floor drain', 'Backflow smell in corridor near faculty lounge.', 'Block 29 - Ground Floor', 'Medium', 40, 0),

        # Cleanliness
        ('Cleanliness', 'Dustbins overflowing near food court at UniMall', 'Food packets, disposable cups, and plastic wrappers scattered around tables.', 'UniMall - Food Court', 'Medium', 300, 0),
        ('Cleanliness', 'Classroom floor covered in mud after rain', 'Wet footprints and debris throughout the aisles between desks.', 'Block 32 - Room 104', 'Low', 70, 0),
        ('Cleanliness', 'Spilled coffee and stains on seminar carpet', 'Dark beverage spill on stage presentation area.', 'Block 32 - Seminar Hall', 'Low', 150, 0),
        ('Cleanliness', 'Hostel mess dining tables sticky and uncleaned', 'Food residues left behind after lunch service.', 'BH-7 - Dining Hall', 'Medium', 250, 0),
        ('Cleanliness', 'Washroom mirrors and tiles grimy and soiled', 'Regular housekeeping missed morning cleaning schedule.', 'Block 38 - 3rd Floor Restroom', 'Low', 80, 0),
        ('Cleanliness', 'Pigeon droppings on window sills and AC ledge', 'Accumulated bird waste blowing into classroom through open window.', 'Block 34 - Room 310', 'Low', 60, 0),
        ('Cleanliness', 'Fallen tree leaves and paper litter blocking drain', 'Outdoor pathway accumulated dry leaves.', 'Block 56 - Sports Complex Walkway', 'Low', 50, 0),

        # Civil
        ('Civil', 'Broken chair in seminar hall', 'Armrest and back support fractured; sharp metal edge exposed.', 'Block 32 - Acoustic Seminar Hall', 'Medium', 180, 1),
        ('Civil', 'Door lock latch jammed in BH-2 hostel room', 'Students trapped inside room 314 due to failed internal lock tumbler mechanism.', 'BH-2 - Room 314', 'Critical', 3, 1),
        ('Civil', 'Ceiling plaster peeling and falling in chunks', 'Chunks of concrete plaster dropped onto empty student desk.', 'Block 33 - Room 202', 'Critical', 50, 1),
        ('Civil', 'Cracked floor tile in sports arena causing tripping hazard', 'Sharp ceramic edge protruding 2cm above adjoining tile.', 'Block 55 - Badminton Arena', 'High', 120, 1),
        ('Civil', 'Window glass pane cracked and rattling in wind', 'Large diagonal fissure across external glass window on 4th floor.', 'Block 34 - Room 418', 'High', 40, 1),
        ('Civil', 'Staircase railing handrail loose and detached', 'Welded steel stanchion wobbles when pressure is applied.', 'Block 38 - North Stairwell', 'High', 200, 1),
        ('Civil', 'Wooden podium hinge snapped in auditorium', 'Presentation lectern unstable and cannot support laptop.', 'Block 25 (Auditorium)', 'Low', 250, 0),

        # Academic Labs
        ('Academic Labs', 'GCC compiler and Python environment broken on CSE Lab 01', 'Students unable to execute coursework due to path environment corruption.', 'Block 34 - CSE Lab 01', 'High', 60, 0),
        ('Academic Labs', 'MATLAB license server error on all terminals', 'Toolbox validation fails with error -96, license expired.', 'Block 34 - CSE Lab 05', 'High', 45, 0),
        ('Academic Labs', 'Oscilloscope probe missing in electronics workstation', 'BNC cable and grounding clip removed from bench 12.', 'Block 36 - Hardware Lab', 'Low', 2, 0),
        ('Academic Labs', 'Network simulator packet tracer crash on launch', 'Software terminates with segmentation fault on Linux distro.', 'Block 34 - CSE Lab 03', 'Medium', 55, 0),
        ('Academic Labs', 'Microcontroller development boards not detected over USB', 'FTDI driver missing after lab system re-image.', 'Block 36 - Embedded Systems Lab', 'High', 30, 0),

        # Hostel
        ('Hostel', 'Almirah cupboard door hinge dislocated', 'Heavy metal wardrobe door hanging by single bottom screw.', 'BH-8 - Room 102', 'Medium', 2, 0),
        ('Hostel', 'Mattress worn out with protruding metal spring', 'Bed spring piercing through fabric causing skin injury risk.', 'GH-3 - Room 215', 'Medium', 1, 1),
        ('Hostel', 'Room door key duplicated by previous occupant', 'Lock cylinder replacement requested for room safety and privacy.', 'BH-1 - Room 502', 'High', 2, 0),
        ('Hostel', 'Curtain rod fell down from bracket', 'Curtain rail detached from plaster wall.', 'GH-5 - Room 309', 'Low', 2, 0),
        ('Hostel', 'Warden signature required for emergency medical leave', 'Parent consent verified but warden unavailable at hostel office.', 'BH-4 - Hostel Office', 'High', 1, 0),

        # Academics
        ('Academics', 'Continuous assessment CA-2 marks missing in UMS', 'Teacher submitted grade sheet but portal marks column displays absent.', 'Block 34 - Examination Office', 'High', 50, 0),
        ('Academics', 'Mid-term examination hall ticket photo mismatch', 'Admit card contains corrupt portrait image, invigilator verification issue.', 'Block 25 - Examination Cell', 'High', 1, 0),
        ('Academics', 'End-term exam timetable clash for re-appear course', 'Two subject papers scheduled at the exact same 9:30 AM slot on Monday.', 'Block 25 - Examination Cell', 'Critical', 15, 0),
        ('Academics', 'Attendance discrepancy of 5 lectures in Data Structures', 'Medical certificate approved by COD but attendance percentage unchanged.', 'Block 34 - CSE Department Office', 'Medium', 1, 0),

        # Finance
        ('Finance', 'Fee receipt not generated after successful UPI payment', 'Bank account debited 68,000 INR but ERP shows fee pending.', 'Block 25 - Accounts Office', 'High', 1, 0),
        ('Finance', 'Hostel mess caution security deposit refund delay', 'Graduated student refund request pending for over 45 days.', 'Block 25 - Accounts Office', 'Medium', 1, 0),
        ('Finance', 'Late fine levied despite paying before deadline', 'System calculated 500 INR late penalty due to server timezone mismatch.', 'Block 25 - Accounts Office', 'Medium', 1, 0),
        ('Finance', 'Scholarship deduction not reflected on semester fee slip', 'Top 5% university merit scholarship concession absent from challan.', 'Block 25 - Accounts Office', 'High', 1, 0),

        # Security
        ('Security', 'Bicycle stolen from UniMall parking bay', 'Locked Hero Sprint cycle missing between 2 PM and 5 PM; CCTV check required.', 'UniMall - East Parking', 'High', 1, 0),
        ('Security', 'Unauthorized trespasser spotted near hostel boundary wall', 'Individual without student ID trying to scale outer perimeter railing.', 'BH-8 - Perimeter Boundary', 'Critical', 80, 1),
        ('Security', 'Student identity card lost in central library', 'Smart card with NFC chip misplaced; request block to prevent misuse.', 'Block 13 (Central Library)', 'Medium', 1, 0),
        ('Security', 'Heated argument and altercation near sports ground gate', 'Aggressive behavior causing safety concern for nearby students.', 'Block 55 - Sports Gate', 'Critical', 40, 1)
    ]

    records = []
    # Expand templates by generating realistic variations across blocks, rooms, and wordings
    variations_prefixes = [
        "Urgent: ", "Request for repair: ", "Problem with ", "Defective ",
        "Assistance needed: ", "Complaint regarding ", "Issue reported: ", ""
    ]

    for category, title, desc, base_loc, priority, affected, is_haz in complaint_templates:
        dept = DEPARTMENTS[category]
        # Add original
        records.append({
            'title': title,
            'description': desc,
            'location': base_loc,
            'category': category,
            'priority': priority,
            'department': dept,
            'affected_users': affected,
            'is_hazard': is_haz
        })

        # Generate 3 realistic variations for each template to achieve ~240 diverse examples
        for i in range(3):
            prefix = random.choice(variations_prefixes)
            # Pick an alternate location if plausible
            if 'Hostel' in category or 'BH' in base_loc or 'GH' in base_loc:
                alt_loc = random.choice(LPU_HOSTELS) + f" - Room {random.randint(101, 520)}"
            elif 'Lab' in base_loc:
                alt_loc = f"Block 34 - CSE Lab 0{random.randint(1, 6)}"
            else:
                alt_loc = random.choice(LPU_BLOCKS) + f" - Room {random.randint(101, 415)}"

            var_title = f"{prefix}{title}".strip()
            # Minor text perturbation
            var_desc = desc.replace("in Central Library", f"in {alt_loc}").replace("Block 34", alt_loc.split(' - ')[0])
            if is_haz:
                var_priority = random.choice(['High', 'Critical'])
            else:
                var_priority = priority

            records.append({
                'title': var_title,
                'description': var_desc,
                'location': alt_loc,
                'category': category,
                'priority': var_priority,
                'department': dept,
                'affected_users': max(1, affected + random.randint(-10, 15)),
                'is_hazard': is_haz
            })

    df = pd.DataFrame(records)
    csv_path = os.path.join(DATA_DIR, 'complaints_dataset.csv')
    df.to_csv(csv_path, index=False)
    print(f"Generated {len(df)} complaints in {csv_path}")
    return df

# ==========================================
# 2. GENERATE QUEUE DATASET (350+ rows)
# ==========================================
def generate_queue_data():
    offices = ['Accounts Office', 'Examination Cell', 'Student Welfare Office', 'Hostel Administration']
    rows = []

    for _ in range(360):
        office = random.choice(offices)
        people_ahead = random.randint(0, 25)
        active_counters = random.randint(1, 4)
        avg_service_time = random.choice([4.0, 5.0, 6.0, 7.5, 8.0, 10.0])
        time_of_day_hour = random.choice([9, 10, 11, 12, 13, 14, 15, 16, 17])

        # Baseline theoretical wait
        baseline = (people_ahead * avg_service_time) / active_counters

        # Office specific friction (Accounts Office has fee reconciliation friction)
        office_bias = 0.0
        if office == 'Accounts Office':
            office_bias = random.uniform(2.5, 6.0)
        elif office == 'Examination Cell':
            office_bias = random.uniform(1.0, 3.5)
        elif office == 'Hostel Administration':
            office_bias = random.uniform(0.5, 2.0)
        else: # Student Welfare
            office_bias = random.uniform(0.0, 1.5)

        # Rush hour penalty (10-12 and 14-16)
        rush_multiplier = 1.0
        if time_of_day_hour in [11, 12, 14, 15]:
            rush_multiplier = random.uniform(1.15, 1.35)
        elif time_of_day_hour in [9, 17]:
            rush_multiplier = random.uniform(0.85, 1.0)

        # Single counter bottleneck penalty
        bottleneck = 0.0
        if active_counters == 1 and people_ahead > 4:
            bottleneck = random.uniform(2.0, 5.0)

        # Noise
        noise = random.gauss(0, 1.2)

        actual_wait = max(0.0, (baseline * rush_multiplier) + office_bias + bottleneck + noise)
        actual_wait = round(actual_wait, 1)

        rows.append({
            'people_ahead': people_ahead,
            'active_counters': active_counters,
            'avg_service_time_minutes': avg_service_time,
            'time_of_day_hour': time_of_day_hour,
            'office_type': office,
            'actual_wait_minutes': actual_wait
        })

    df = pd.DataFrame(rows)
    csv_path = os.path.join(DATA_DIR, 'queue_dataset.csv')
    df.to_csv(csv_path, index=False)
    print(f"Generated {len(df)} queue rows in {csv_path}")
    return df

# ==========================================
# 3. GENERATE MAINTENANCE DATASET (320+ rows)
# ==========================================
def generate_maintenance_data():
    equipment_types = [
        ('Air Conditioner', 'Heavy Duty', 365 * 5),
        ('Projector', 'Heavy Duty', 365 * 4),
        ('Lab Server', 'Heavy Duty', 365 * 6),
        ('Desktop PC', 'Standard', 365 * 5),
        ('Ceiling Fan', 'Standard', 365 * 8),
        ('Water Cooler', 'Heavy Duty', 365 * 4),
        ('Fluorescent Light', 'Standard', 365 * 3),
        ('Acoustic Amplifier', 'Standard', 365 * 5)
    ]

    rows = []
    for _ in range(320):
        eq_name, usage_cat, rated_life_days = random.choice(equipment_types)
        equipment_age_days = random.randint(30, int(rated_life_days * 1.3))
        failures_last_90_days = random.choices([0, 1, 2, 3, 4, 5], weights=[0.45, 0.25, 0.15, 0.08, 0.05, 0.02])[0]
        days_since_last_maint = random.randint(5, 300)

        # Defendable Risk Calculation Model:
        # Failure velocity: up to 45 pts
        failure_component = min(45.0, failures_last_90_days * 15.0)

        # Service overdue: up to 35 pts
        maint_component = 0.0
        if days_since_last_maint > 180:
            maint_component = 35.0
        elif days_since_last_maint > 90:
            maint_component = 25.0
        elif days_since_last_maint > 45:
            maint_component = 15.0
        elif days_since_last_maint > 30:
            maint_component = 5.0

        # Aging component: up to 20 pts
        age_ratio = min(1.2, equipment_age_days / rated_life_days)
        age_component = min(20.0, age_ratio * 18.0)

        # Duty cycle premium
        duty_premium = 6.0 if usage_cat == 'Heavy Duty' else 0.0

        # Non-linear interaction between aging and lack of maintenance
        interaction = 0.0
        if failures_last_90_days >= 2 and days_since_last_maint > 90:
            interaction = random.uniform(4.0, 10.0)

        noise = random.gauss(0, 2.0)

        total_risk = failure_component + maint_component + age_component + duty_premium + interaction + noise
        total_risk = max(0.0, min(100.0, round(total_risk, 1)))

        rows.append({
            'equipment_type': eq_name,
            'equipment_age_days': equipment_age_days,
            'failures_last_90_days': failures_last_90_days,
            'days_since_last_maintenance': days_since_last_maint,
            'usage_category': usage_cat,
            'risk_score': total_risk
        })

    df = pd.DataFrame(rows)
    csv_path = os.path.join(DATA_DIR, 'maintenance_dataset.csv')
    df.to_csv(csv_path, index=False)
    print(f"Generated {len(df)} maintenance rows in {csv_path}")
    return df

if __name__ == '__main__':
    generate_complaints()
    generate_queue_data()
    generate_maintenance_data()
    print("All synthetic datasets generated successfully.")
