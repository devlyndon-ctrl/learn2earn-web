"""
Quiz Generator for JHS Matatag Curriculum
Validates and generates quizzes from uploaded lesson plans
"""
import re
from typing import List, Dict, Any, Tuple
from difflib import SequenceMatcher
import random
import logging

# Import all science datasets
from datasets.science.science_grade7_dataset import SCIENCE_GRADE7_QUESTIONS
from datasets.science.science_grade8_dataset import SCIENCE_GRADE8_QUESTIONS
from datasets.science.science_grade9_dataset import SCIENCE_GRADE9_QUESTIONS
from datasets.science.science_grade10_dataset import SCIENCE_GRADE10_QUESTIONS

logger = logging.getLogger(__name__)

class ScienceQuizGenerator:
    def __init__(self, grade7_questions, grade8_questions, grade9_questions=None, grade10_questions=None):
        """Initialize with science datasets"""
        grade9_questions = grade9_questions or []
        grade10_questions = grade10_questions or []
        
        self.all_questions = grade7_questions + grade8_questions + grade9_questions + grade10_questions
        self.grade7_questions = grade7_questions
        self.grade8_questions = grade8_questions
        self.grade9_questions = grade9_questions
        self.grade10_questions = grade10_questions
        
        # Create topic index
        self.topic_index = self._create_topic_index()
        
    def _create_topic_index(self) -> Dict[str, List[int]]:
        """Create index of questions by topic"""
        topic_index = {}
        for i, q in enumerate(self.all_questions):
            topic = q.get('topic', 'General')
            if topic not in topic_index:
                topic_index[topic] = []
            topic_index[topic].append(i)
        return topic_index
    
    def _get_grade_from_index(self, idx: int) -> int:
        """Determine which grade level a question belongs to based on its index"""
        grade7_end = len(self.grade7_questions)
        grade8_end = grade7_end + len(self.grade8_questions)
        grade9_end = grade8_end + len(self.grade9_questions)
        
        if idx < grade7_end:
            return 7
        elif idx < grade8_end:
            return 8
        elif idx < grade9_end:
            return 9
        else:
            return 10
    
    def detect_grade_level(self, lesson_text: str) -> int:
        """Detect which grade level (7-10) the lesson belongs to"""
        lesson_lower = lesson_text.lower()
        
        # Grade-specific keywords
        grade7_keywords = ['particle model', 'scientific investigation', 'litmus', 'state of matter', 
                          'solutions', 'solubility', 'microscope', 'cell membrane', 'mitosis', 'meiosis',
                          'trophic level', 'balanced forces', 'distance-time graph', 'heat transfer']
        
        grade8_keywords = ['atomic model', 'subatomic particles', 'periodic table', 'valence electrons',
                          'organ systems', 'heredity', 'taxonomic classification', 'photosynthesis',
                          'respiration', 'volcano', 'typhoon', 'tides', 'acceleration', 'kinetic energy',
                          'potential energy', 'reflection', 'refraction', 'light', 'mirror', 'lens']
        
        grade9_keywords = ['newton\'s laws', 'electric current', 'electrical circuits', 'electromagnetic waves',
                          'plate boundaries', 'plate tectonics', 'geologic time', 'radiactive decay',
                          'dna', 'dna replication', 'mutations', 'biodiversity', 'endangered species',
                          'ionic bond', 'covalent bond', 'metallic bond', 'chemical formula']
        
        grade10_keywords = ['greenhouse gases', 'global warming', 'climate change', 'renewable energy',
                           'projectile motion', 'momentum', 'collisions', 'power generation', 'power plants',
                           'chemical reactions', 'acids', 'bases', 'salts', 'homeostasis', 'evolution',
                           'natural selection', 'biotechnology', 'carrying capacity']
        
        g7_score = sum(1 for kw in grade7_keywords if kw in lesson_lower)
        g8_score = sum(1 for kw in grade8_keywords if kw in lesson_lower)
        g9_score = sum(1 for kw in grade9_keywords if kw in lesson_lower)
        g10_score = sum(1 for kw in grade10_keywords if kw in lesson_lower)
        
        scores = [(g7_score, 7), (g8_score, 8), (g9_score, 9), (g10_score, 10)]
        max_score = max(scores, key=lambda x: x[0])
        
        # If clear winner, return that grade, else check filename for grade hints
        if max_score[0] > 0:
            return max_score[1]
        
        # Fallback: check filename or return 7 as default
        for grade in [7, 8, 9, 10]:
            if f'grade{grade}' in lesson_lower or f'grade {grade}' in lesson_lower:
                return grade
        return 7

    def extract_topics_from_lesson(self, lesson_text: str) -> Dict[str, Dict]:
        """Extract science topics from lesson plan"""
        lesson_lower = lesson_text.lower()
        topic_scores = {}
        
        # Detect grade level first
        grade = self.detect_grade_level(lesson_text)
        
        # Science topic keywords organized by grade
        if grade == 7:
            keywords_map = {
                'Use of Models': ['model', 'diagram', 'simulation', 'representation', 'visualize', 'flowchart', 'scientists use models'],
                'Particle Model of Matter': ['particle model', 'particle', 'atom', 'molecule', 'kinetic', 'motion', 'arrangement', 'matter'],
                'Changes of State': ['melt', 'freeze', 'boil', 'evaporate', 'condense', 'sublimate', 'state of matter', 'change state'],
                'Solutions and Solubility': ['solution', 'solute', 'solvent', 'dissolve', 'solubility', 'saturated', 'concentration'],
                'Scientific Investigation': ['hypothesis', 'experiment', 'variable', 'data', 'conclusion', 'method', 'investigation', 'steps'],
                'The Compound Microscope': ['compound microscope', 'microscope', 'lens', 'objective', 'eyepiece', 'stage', 'focus', 'magnification'],
                'Plant and Animal Cells': ['cell membrane', 'cell wall', 'nucleus', 'cytoplasm', 'chromosome', 'chloroplast', 'mitochondria', 'organelle'],
                'Cellular Reproduction': ['mitosis', 'meiosis', 'reproduction', 'gamete', 'zygote', 'division', 'fertilization'],
                'Levels of Biological Organization': ['tissue', 'organ', 'system', 'organism', 'population', 'community', 'biosphere', 'biological organization'],
                'Trophic Levels and Energy Transfer': ['food chain', 'food web', 'producer', 'consumer', 'energy', 'pyramid', 'trophic'],
                'Balanced and Unbalanced Forces': ['balanced force', 'unbalanced force', 'force', 'equilibrium', 'net force'],
                'Speed and Velocity': ['speed', 'velocity', 'distance', 'time', 'direction', 'vector', 'displacement'],
                'Distance-Time Graphs': ['distance-time graph', 'slope', 'constant velocity', 'uniform motion', 'motion graph'],
                'Heat and Temperature': ['heat', 'temperature', 'conduction', 'convection', 'radiation', 'thermal', 'conductor', 'insulator'],
                'Faults and Earthquakes': ['fault', 'earthquake', 'seismic', 'epicenter', 'magnitude', 'intensity', 'focus'],
                'Solar Energy and Weather': ['weather', 'climate', 'monsoon', 'habagat', 'amihan', 'typhoon', 'solar energy'],
                'Disaster Risk Reduction': ['disaster', 'disaster risk reduction', 'preparedness', 'evacuation', 'hazard', 'paghahanda'],
            }
        elif grade == 8:
            keywords_map = {
                'Organ Systems': ['organ system', 'digestive', 'excretory', 'circulatory', 'nervous', 'respiratory'],
                'Heredity': ['heredity', 'inheritance', 'dominant', 'recessive', 'trait', 'genes', 'phenotype', 'genotype'],
                'Taxonomic Classification': ['classification', 'taxonomy', 'kingdom', 'domain', 'species', 'genus'],
                'Photosynthesis and Respiration': ['photosynthesis', 'respiration', 'glucose', 'carbon dioxide', 'oxygen', 'chlorophyll'],
                'Cycles in Nature': ['water cycle', 'carbon cycle', 'oxygen cycle', 'nitrogen cycle', 'biogeochemical'],
                'Atomic Model': ['atom', 'atomic model', 'nucleus', 'electron shell', 'subatomic', 'proton', 'neutron', 'electron'],
                'Subatomic Particles': ['proton', 'neutron', 'electron', 'mass', 'charge', 'atomic number'],
                'Periodic Table': ['periodic table', 'element', 'group', 'period', 'valence', 'reactivity', 'properties of elements'],
                'Continents and Crustal Features': ['continent', 'oceanic crust', 'continental crust', 'crust', 'lithosphere', 'distribution'],
                'Volcanoes': ['volcano', 'lava', 'eruption', 'magma', 'volcanic cone', 'ash', 'pyroclastic'],
                'Plate Tectonics': ['plate', 'plate tectonics', 'lithospheric plates', 'plate boundary', 'convergent', 'divergent'],
                'Typhoons': ['typhoon', 'cyclone', 'tropical storm', 'wind', 'landforms', 'bodies of water'],
                'Tides': ['tide', 'tidal', 'moon', 'sun', 'gravitational', 'interaction'],
                'Acceleration': ['acceleration', 'velocity change', 'rate of change', 'uniform acceleration', 'non-uniform'],
                'Graphing Motion': ['distance-time graph', 'velocity-time graph', 'acceleration graph', 'slope', 'motion'],
                'Kinetic and Potential Energy': ['kinetic energy', 'potential energy', 'energy transformation', 'conservation'],
                'Work and Energy': ['work', 'energy', 'force', 'displacement', 'power', 'rate'],
                'Light Properties': ['light', 'reflection', 'refraction', 'mirror', 'lens', 'prism', 'transparent'],
                'Renewable Energy': ['renewable', 'hydroelectric', 'solar', 'wind', 'dam', 'resources'],
            }
        elif grade == 9:
            keywords_map = {
                'Newton\'s Laws': ['newton\'s law', 'inertia', 'acceleration', 'force', 'action-reaction', 'net force'],
                'Electric Current': ['electric current', 'electricity', 'electrons', 'flow', 'safe measures'],
                'Electrical Circuits': ['series circuit', 'parallel circuit', 'circuit diagram', 'ammeter', 'voltmeter', 'switch'],
                'Electromagnetic Waves': ['electromagnetic radiation', 'emr', 'transverse wave', 'wavelength', 'frequency'],
                'Electromagnetic Spectrum': ['radio wave', 'microwave', 'infrared', 'visible light', 'ultraviolet', 'x-ray', 'gamma ray'],
                'Plate Boundaries': ['plate boundary', 'convergent', 'divergent', 'transform', 'subduction'],
                'Earth\'s Structure': ['earth interior', 'crust', 'mantle', 'core', 'lithosphere', 'asthenosphere'],
                'Geologic Time': ['geologic time', 'fossil dating', 'relative dating', 'absolute dating', 'geologic time scale'],
                'Origin of Solar System': ['solar system', 'comet', 'meteoroid', 'asteroid', 'dwarf planet', 'formation'],
                'DNA Replication': ['dna', 'dna replication', 'double helix', 'replication', 'gene', 'chromosome'],
                'Mutations': ['mutation', 'dna change', 'radiation', 'chemicals', 'beneficial', 'harmful'],
                'Biodiversity': ['biodiversity', 'endangered species', 'vulnerable', 'critically endangered', 'extinction'],
                'Vulnerable Species': ['vulnerable', 'endangered', 'threatened', 'species conservation'],
                'Philippine Ecosystems': ['rainforest', 'swamp', 'estuary', 'mangrove', 'coral reef', 'ecosystem'],
                'Human Impact on Environment': ['deforestation', 'pollution', 'invasive species', 'human activities'],
                'Ionic Bonding': ['ionic bond', 'ion', 'electron transfer', 'sodium chloride', 'compound'],
                'Covalent Bonding': ['covalent bond', 'electron sharing', 'water', 'carbon dioxide', 'molecule'],
                'Metallic Bonding': ['metallic bond', 'metal', 'sea of electrons', 'properties'],
                'Chemical Formula': ['chemical formula', 'compound', 'element', 'symbol'],
                'Impulse': ['impulse', 'force', 'time', 'impact force'],
                'Momentum': ['momentum', 'mass', 'velocity', 'collision'],
                'Projectile Motion': ['projectile motion', 'trajectory', 'angle', 'range'],
            }
        else:  # grade 10
            keywords_map = {
                'Plate Tectonics': ['plate tectonics', 'plate movement', 'convection', 'ridge', 'subduction', 'gravity-driven'],
                'Global Climate': ['climate change', 'global warming', 'climate', 'greenhouse gas', 'CO2', 'emissions'],
                'Climate Impacts': ['el niño', 'weather systems', 'climate phenomenon', 'impacts'],
                'Renewable Energies': ['renewable energy', 'sustainable', 'solar', 'wind', 'hydro', 'geothermal'],
                'Projectile Motion': ['projectile', 'trajectory', 'angle', 'velocity', 'height', 'range'],
                'Momentum and Collisions': ['momentum', 'collision', 'elastic', 'inelastic', 'impact'],
                'Power Generation': ['power plant', 'electricity generation', 'transmission', 'distribution', 'substation'],
                'Electrical Safety': ['safe handling', 'electrical safety', 'household', 'precautions'],
                'Electric Motors and Generators': ['motor', 'generator', 'similarities', 'differences'],
                'Chemical Reactions': ['chemical reaction', 'indicator', 'color change', 'precipitate', 'gas', 'temperature'],
                'Acids, Bases, and Salts': ['acid', 'base', 'salt', 'indicator', 'litmus', 'hydrochloric', 'sodium hydroxide'],
                'Types of Reactions': ['combination', 'decomposition', 'replacement', 'combustion', 'reaction type'],
                'Balanced Equations': ['chemical equation', 'balanced', 'conservation of mass', 'formula'],
                'Reaction Rates': ['reaction rate', 'factors', 'food preservation', 'corrosion', 'fire'],
                'Homeostasis': ['homeostasis', 'body temperature', 'glucose level', 'blood pressure', 'balance'],
                'Mechanisms of Evolution': ['evolution', 'natural selection', 'adaptation', 'variation', 'heredity'],
                'Evolution Evidence': ['fossil', 'biogeography', 'comparative morphology', 'evidence'],
                'Biotechnology': ['biotechnology', 'fermentation', 'cheese', 'genetically modified', 'in vitro'],
                'Population and Carrying Capacity': ['population growth', 'carrying capacity', 'limiting factors', 'ecosystem'],
            }
        
        
        for topic, keywords in keywords_map.items():
            score = 0
            found_keywords = []
            for keyword in keywords:
                if keyword in lesson_lower:
                    count = lesson_lower.count(keyword)
                    score += count
                    found_keywords.append(keyword)
            
            if score > 0:
                topic_scores[topic] = {
                    'score': score,
                    'keywords': found_keywords,
                    'percentage': 0
                }
        
        # Normalize to percentages
        if topic_scores:
            total = sum(t['score'] for t in topic_scores.values())
            for topic in topic_scores:
                topic_scores[topic]['percentage'] = (topic_scores[topic]['score'] / total) * 100
        
        # Filter topics below 10% threshold
        filtered_topics = {topic: data for topic, data in topic_scores.items() if data['percentage'] >= 10}
        
        # Recalculate percentages for filtered topics to sum to 100%
        if filtered_topics:
            filtered_total = sum(t['score'] for t in filtered_topics.values())
            for topic in filtered_topics:
                filtered_topics[topic]['percentage'] = (filtered_topics[topic]['score'] / filtered_total) * 100
            topic_scores = filtered_topics
        
        return dict(sorted(topic_scores.items(), key=lambda x: x[1]['percentage'], reverse=True))
    
    def detect_quarter_from_lesson(self, lesson_text: str) -> str:
        """
        Analyze lesson text to determine which quarter the content belongs to
        based on the topics in your Grade 7 question bank
        Returns: 'First Quarter', 'Second Quarter', 'Third Quarter', 'Fourth Quarter', or None
        """
        try:
            # First try using the AI model if available
            if hasattr(self, 'model'):
                prompt = f"""Analyze this science lesson plan and determine which quarter of the Grade 7 curriculum it belongs to.
                
                The Grade 7 Science quarters cover these topics:
                
                First Quarter: Use of Models, Particle Model of Matter, Changes of State, Solutions and Solubility, Scientific Investigation
                
                Second Quarter: The Compound Microscope, Plant and Animal Cells, Cellular Reproduction, Levels of Biological Organization, Trophic Levels and Energy Transfer
                
                Third Quarter: Balanced and Unbalanced Forces, Speed and Velocity, Distance-Time Graphs, Heat and Temperature
                
                Fourth Quarter: Faults and Earthquakes, Solar Energy and Weather Patterns, Disaster Risk Reduction
                
                Lesson text:
                {lesson_text[:3000]}
                
                Based on the content, which quarter does this lesson belong to? 
                Return ONLY the quarter name exactly as written above (e.g., "First Quarter", "Second Quarter", "Third Quarter", or "Fourth Quarter").
                If you're unsure, make your best guess based on the topics present."""
                
                response = self.model.invoke(prompt)
                detected_quarter = response.content.strip()
                
                # Validate that the response matches one of our quarters
                valid_quarters = ['First Quarter', 'Second Quarter', 'Third Quarter', 'Fourth Quarter']
                
                if detected_quarter in valid_quarters:
                    return detected_quarter
            
            # Fallback to keyword matching
            return self._infer_quarter_from_keywords(lesson_text)
            
        except Exception as e:
            logger.error(f"Error detecting quarter: {e}")
            # Fallback to keyword matching
            return self._infer_quarter_from_keywords(lesson_text)

    def _infer_quarter_from_keywords(self, lesson_text: str) -> str:
        """Fallback method to infer quarter from keywords based on curriculum standards"""
        text_lower = lesson_text.lower()
        
        # Detect grade level first
        grade = self.detect_grade_level(lesson_text)
        
        if grade == 7:
            # Grade 7 Quarter breakdown per Matatag Curriculum
            # Q1: Science of Materials - FOCUS ON MODELS AND PARTICLES
            q1_keywords = [
                'use of models', 'scientists use models', 'particle model', 'particle model of matter',
                'changes of state', 'particle', 'matter', 'state of matter', 'solid', 
                'liquid', 'gas', 'solution', 'solubility', 'solute', 'solvent', 
                'scientific investigation', 'hypothesis', 'experiment', 'variable', 'melting', 
                'freezing', 'evaporation', 'condensation', 'sublimation', 'kinetic', 'litmus'
            ]
            
            # Q2: Life Science - FOCUS ON CELLS AND MICROSCOPY
            q2_keywords = [
                'compound microscope', 'microscope', 'cell membrane', 'organelle', 'nucleus', 'cytoplasm', 
                'mitochondria', 'chloroplast', 'ribosome', 'golgi', 'cell wall', 'membrane', 'tissue', 'organ', 
                'system', 'photosynthesis', 'respiration', 'unicellular', 'multicellular', 
                'mitosis', 'meiosis', 'reproduction', 'food chain', 'food web', 'trophic level', 
                'ecosystem', 'gamete', 'zygote', 'chromosome', 'population', 'community'
            ]
            
            # Q3: Force, Motion and Energy
            q3_keywords = [
                'balanced force', 'unbalanced force', 'force', 'motion', 'speed', 'velocity', 
                'acceleration', 'displacement', 'distance-time', 'graph', 'friction', 
                'gravity', 'heat transfer', 'temperature', 'conduction', 'convection', 'radiation', 
                'conductor', 'insulator', 'thermal'
            ]
            
            # Q4: Earth and Space Science - FOCUS ON EARTHQUAKES AND WEATHER
            q4_keywords = [
                'fault', 'earthquake', 'seismic', 'epicenter', 'magnitude', 'intensity', 
                'tsunami', 'volcano', 'weather pattern', 'climate', 'monsoon', 'habagat', 'amihan', 
                'typhoon', 'disaster preparedness', 'disaster risk reduction', 'evacuation', 'hazard'
            ]
        
        elif grade == 8:
            q1_keywords = [
                'organ system', 'digestive', 'excretory', 'heredity', 'inheritance', 'dominant', 
                'recessive', 'trait', 'genes', 'taxonomy', 'classification', 'kingdom', 'domain',
                'photosynthesis', 'respiration', 'glucose', 'carbon dioxide', 'oxygen', 
                'chlorophyll', 'water cycle', 'carbon cycle', 'oxygen cycle'
            ]
            
            q2_keywords = [
                'atom', 'atomic model', 'nucleus', 'electron shell', 'subatomic particle', 
                'proton', 'neutron', 'electron', 'atomic number', 'periodic table', 'element', 
                'group', 'period', 'valence electron', 'reactivity', 'properties of elements'
            ]
            
            q3_keywords = [
                'continent', 'oceanic crust', 'continental crust', 'lithosphere', 'volcano', 
                'lava', 'magma', 'eruption', 'plate tectonics', 'plate boundary', 'typhoon',
                'cyclone', 'tropical storm', 'tide', 'tidal', 'moon', 'gravitational'
            ]
            
            q4_keywords = [
                'acceleration', 'velocity change', 'distance-time graph', 'velocity-time graph', 
                'kinetic energy', 'potential energy', 'energy transformation', 'conservation of energy',
                'work', 'power', 'light', 'reflection', 'refraction', 'mirror', 'lens', 'prism',
                'renewable energy', 'hydroelectric', 'dam'
            ]
        
        elif grade == 9:
            q1_keywords = [
                'newton law', 'inertia', 'force', 'acceleration', 'action-reaction', 'net force',
                'electric current', 'electricity', 'electrons', 'series circuit', 'parallel circuit',
                'ammeter', 'voltmeter', 'electromagnetic radiation', 'emr', 'transverse wave',
                'wavelength', 'frequency', 'radio wave', 'microwave', 'infrared', 'ultraviolet'
            ]
            
            q2_keywords = [
                'plate boundary', 'convergent', 'divergent', 'transform boundary', 'subduction', 
                'earth interior', 'mantle', 'core', 'lithosphere', 'asthenosphere', 
                'geologic time', 'fossil dating', 'relative dating', 'absolute dating', 
                'solar system', 'comet', 'meteoroid', 'asteroid', 'dwarf planet'
            ]
            
            q3_keywords = [
                'dna', 'deoxyribonucleic', 'double helix', 'dna replication', 'gene', 'chromosome', 'mutation', 
                'biodiversity', 'endangered species', 'critically endangered', 'extinction',
                'vulnerable', 'rainforest', 'swamp', 'estuary', 'mangrove', 'coral reef',
                'deforestation', 'pollution', 'invasive species'
            ]
            
            # Note: Grade 9 Q4 is actually LIFE SCIENCE (DNA/mutations). 
            # Impulse/Momentum are Grade 10 Q2, but included here for misLabeled files
            q4_keywords = [
                'impulse', 'momentum', 'collision', 'elastic', 'inelastic', 'impact force',
                'projectile motion', 'trajectory', 'ionic bond', 'covalent bond', 
                'electron transfer', 'electron sharing', 'metallic bond', 'sea of electrons', 
                'chemical formula', 'compound', 'chemical reaction', 'indicator', 'precipitate', 
                'valence electron'
            ]
        
        else:  # grade 10
            q1_keywords = [
                'plate tectonics', 'plate movement', 'convection', 'ridge', 'subduction', 
                'climate change', 'global warming', 'greenhouse gas', 'el niño', 
                'renewable energy', 'sustainable', 'natural resources'
            ]
            
            q2_keywords = [
                'projectile motion', 'trajectory', 'angle', 'velocity', 'momentum', 'collision',
                'elastic', 'inelastic', 'impact', 'power plant', 'electricity generation',
                'transmission', 'distribution', 'substation', 'motor', 'generator'
            ]
            
            q3_keywords = [
                'chemical reaction', 'indicator', 'color change', 'precipitate', 'gas release',
                'acid', 'base', 'salt', 'litmus', 'equation', 'balanced', 'conservation of mass',
                'reaction rate', 'food preservation', 'corrosion'
            ]
            
            q4_keywords = [
                'homeostasis', 'body temperature', 'glucose', 'blood pressure', 'evolution',
                'natural selection', 'adaptation', 'variation', 'fossil', 'biogeography',
                'biotechnology', 'fermentation', 'genetically modified', 'population growth',
                'carrying capacity'
            ]
        
        # Count matches
        q1_score = sum(2 if len(kw.split()) > 1 else 1 for kw in q1_keywords if kw in text_lower)
        q2_score = sum(2 if len(kw.split()) > 1 else 1 for kw in q2_keywords if kw in text_lower)
        q3_score = sum(2 if len(kw.split()) > 1 else 1 for kw in q3_keywords if kw in text_lower)
        q4_score = sum(2 if len(kw.split()) > 1 else 1 for kw in q4_keywords if kw in text_lower)
        
        scores = [
            (q1_score, 'First Quarter'),
            (q2_score, 'Second Quarter'),
            (q3_score, 'Third Quarter'),
            (q4_score, 'Fourth Quarter')
        ]
        
        # Get the quarter with highest score
        max_score = max(scores, key=lambda x: x[0])
        
        # Return if we have a meaningful score, otherwise check for explicit quarter labels
        if max_score[0] >= 2:
            return max_score[1]
        
        # Check for explicit quarter labels in text
        if 'unang markahan' in text_lower or 'first quarter' in text_lower or 'q1' in text_lower:
            return 'First Quarter'
        elif 'ikalawang markahan' in text_lower or 'second quarter' in text_lower or 'q2' in text_lower:
            return 'Second Quarter'
        elif 'ikatlong markahan' in text_lower or 'third quarter' in text_lower or 'q3' in text_lower or 'third' in text_lower:
            return 'Third Quarter'
        elif 'ikaapat na markahan' in text_lower or 'fourth quarter' in text_lower or 'q4' in text_lower:
            return 'Fourth Quarter'
        
        # Default based on filename hints
        for idx, (score, quarter) in enumerate(scores):
            if scores[idx][0] > 0:
                return scores[idx][1]
        
        return 'First Quarter'
    
    def calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate text similarity"""
        t1 = text1.lower().strip()
        t2 = text2.lower().strip()
        return SequenceMatcher(None, t1, t2).ratio()
    
    def find_matching_questions(self, lesson_text: str, num_questions: int = 5, 
                               topic_filter: str = None, quarter_filter: str = None,
                               exclude_questions: List[Dict] = None) -> List[Dict[str, Any]]:
        """Find questions matching lesson content, excluding specified questions
        
        This method tries to find questions with the specified topic and quarter.
        If not enough questions are available (after exclusions), it relaxes constraints
        to ensure variety and prevent repetition during refreshes.
        """
        
        if exclude_questions is None:
            exclude_questions = []
        
        # Extract topics
        topics = self.extract_topics_from_lesson(lesson_text)
        
        if not topics and not topic_filter:
            # Return random questions from the specified quarter if available
            return self._get_random_questions(num_questions, quarter_filter, exclude_questions)
        
        # Get dominant topic
        if topic_filter:
            dominant_topic = topic_filter
        else:
            dominant_topic = list(topics.keys())[0]
        
        # Helper function to check if question is excluded
        def is_question_excluded(q):
            question_text = q.get('question', '').lower()
            for excluded_q in exclude_questions:
                if (excluded_q.get('question', '').lower() == question_text or 
                    (excluded_q.get('question', '') and q.get('question', '') and 
                     self.calculate_similarity(excluded_q.get('question', ''), question_text) > 0.85)):
                    return True
            return False
        
        # PASS 1: Try strict topic + quarter matching
        scored_questions = []
        lesson_lower = lesson_text.lower()
        
        for i, q in enumerate(self.all_questions):
            if is_question_excluded(q):
                continue
            
            question_text = q.get('question', '').lower()
            topic = q.get('topic', '')
            quarter = q.get('quarter', '')
            
            # Strict: must match topic
            if dominant_topic.lower() not in topic.lower():
                continue
            
            # Higher score if topic matches
            score = 10
            
            # Bonus if quarter matches detected quarter
            if quarter_filter and quarter_filter in quarter:
                score += 5
            
            # Check for keyword matches
            for word in lesson_lower.split():
                if len(word) > 3 and word in question_text:
                    score += 1
            
            similarity = self.calculate_similarity(lesson_text, question_text)
            scored_questions.append((score + similarity, q, i))
        
        # Sort by score
        scored_questions.sort(reverse=True, key=lambda x: x[0])
        
        # If we have enough questions with strict topic matching, use them
        if len(scored_questions) >= num_questions:
            selected = scored_questions[:num_questions]
        else:
            # PASS 2: Fallback - allow all quarters but keep same topic
            selected_indices = set(idx for _, _, idx in scored_questions)
            fallback_questions = []
            
            for i, q in enumerate(self.all_questions):
                if i in selected_indices or is_question_excluded(q):
                    continue
                
                topic = q.get('topic', '')
                
                # Allow same topic but different quarter
                if dominant_topic.lower() in topic.lower():
                    question_text = q.get('question', '').lower()
                    score = 8  # Slightly lower than quarter-matched
                    
                    for word in lesson_lower.split():
                        if len(word) > 3 and word in question_text:
                            score += 1
                    
                    similarity = self.calculate_similarity(lesson_text, question_text)
                    fallback_questions.append((score + similarity, q, i))
            
            # Combine strict + fallback
            fallback_questions.sort(reverse=True, key=lambda x: x[0])
            needed = num_questions - len(scored_questions)
            scored_questions.extend(fallback_questions[:needed])
            selected = scored_questions[:num_questions]
            
            # PASS 3: If still not enough, fall back to random questions from the quarter
            if len(selected) < num_questions:
                # Get additional random questions from the detected quarter
                random_questions = self._get_random_questions(
                    num_questions - len(selected),
                    quarter_filter=quarter_filter,
                    exclude_questions=exclude_questions
                )
                
                # Convert random_questions (already formatted) back to selected format
                # But actually, we need to just use them directly since they're already formatted
                # So let's handle this differently
                if random_questions:
                    # We already have some selected questions, just append the random ones
                    return selected + random_questions if selected else random_questions
        
        # Build quiz items
        quiz = []
        for score, q, idx in selected:
            quiz_item = {
                'question': q['question'],
                'correct_answer': q.get('correct_index', 0),
                'choices': q.get('choices', []),
                'topic': q.get('topic', ''),
                'quarter': q.get('quarter', ''),
                'grade': self._get_grade_from_index(idx)
            }
            
            # Shuffle choices
            choices = quiz_item['choices'][:]
            correct = q['choices'][q.get('correct_index', 0)]
            random.shuffle(choices)
            quiz_item['correct_answer'] = choices.index(correct)
            quiz_item['choices'] = choices
            
            quiz.append(quiz_item)
        
        random.shuffle(quiz)
        return quiz
    
    def _get_random_questions(self, num_questions: int, quarter_filter: str = None, 
                             exclude_questions: List[Dict] = None) -> List[Dict[str, Any]]:
        """Get random questions from dataset, optionally filtered by quarter and excluding specified questions"""
        if exclude_questions is None:
            exclude_questions = []
        
        # Build list of questions to exclude by matching
        excluded_indices = set()
        for excluded_q in exclude_questions:
            excluded_text = excluded_q.get('question', '').lower()
            for i, q in enumerate(self.all_questions):
                if (q.get('question', '').lower() == excluded_text or
                    (excluded_text and q.get('question', '') and
                     self.calculate_similarity(excluded_text, q.get('question', '').lower()) > 0.85)):
                    excluded_indices.add(i)
        
        if quarter_filter:
            # Filter questions by quarter and exclude used ones
            available_questions = [q for i, q in enumerate(self.all_questions) 
                                  if q.get('quarter', '') == quarter_filter and i not in excluded_indices]
            if available_questions:
                selected = random.sample(available_questions, 
                                       min(num_questions, len(available_questions)))
            else:
                # If no available questions in quarter, get from all questions excluding used
                available_all = [q for i, q in enumerate(self.all_questions) if i not in excluded_indices]
                selected = random.sample(available_all, 
                                       min(num_questions, len(available_all)))
        else:
            available_questions = [q for i, q in enumerate(self.all_questions) if i not in excluded_indices]
            selected = random.sample(available_questions, 
                                   min(num_questions, len(available_questions)))
        
        quiz = []
        for q in selected:
            quiz_item = {
                'question': q['question'],
                'correct_answer': q.get('correct_index', 0),
                'choices': q.get('choices', []),
                'topic': q.get('topic', ''),
                'quarter': q.get('quarter', ''),
                'grade': 7
            }
            
            # Shuffle choices
            choices = quiz_item['choices'][:]
            correct = q['choices'][q.get('correct_index', 0)]
            random.shuffle(choices)
            quiz_item['correct_answer'] = choices.index(correct)
            quiz_item['choices'] = choices
            
            quiz.append(quiz_item)
        
        return quiz
    
    def validate_lesson_plan(self, lesson_text: str) -> Tuple[bool, str]:
        """
        Validate if the uploaded content appears to be an actual lesson plan
        Returns: (is_valid, error_message)
        Strict validation to prevent random files from being processed
        """
        if not lesson_text:
            return False, "No content found in the document."
        
        text_lower = lesson_text.lower()
        word_count = len(lesson_text.split())
        char_count = len(lesson_text.strip())
        
        # STRICT: Minimum content requirements
        if char_count < 500:
            return False, "Document is too short. Upload a detailed lesson plan with at least 500 characters."
        
        if word_count < 80:
            return False, "Document doesn't have enough content. Upload a proper lesson plan (minimum 80 words)."
        
        # STRICT: Reject resume/CV documents
        resume_keywords = {
            'resume', 'cv', 'curriculum vitae', 'email:', 'phone:', 'contact:',
            'address:', 'linkedin', 'github', 'professional experience', 'employment history',
            'objective:', 'summary:', 'technical skills:', 'education:', 'references:',
            'work experience', 'career objective', 'qualifications', 'accomplishments'
        }
        resume_count = sum(1 for keyword in resume_keywords if keyword in text_lower)
        if resume_count >= 2:
            return False, "This appears to be a resume or CV. Please upload a science lesson plan instead."
        
        # STRICT: Reject business/legal documents
        non_edu_keywords = {
            'invoice', 'receipt', 'purchase order', 'bill of lading', 'shipping',
            'product listing', 'menu', 'advertisement', 'contract', 'agreement',
            'legal notice', 'privacy policy', 'terms of service', 'pricing', 'quote',
            'payment', 'sale', 'transaction', 'business license', 'tax', 'order form'
        }
        non_edu_count = sum(1 for keyword in non_edu_keywords if keyword in text_lower)
        if non_edu_count >= 2:
            return False, "This is a business/legal document. Please upload a science lesson plan."
        
        # STRICT: Check for science curriculum topics
        topics = self.extract_topics_from_lesson(lesson_text)
        
        if not topics or len(topics) == 0:
            return False, "No science curriculum topics detected. This doesn't appear to be a science lesson plan."
        
        # STRICT: Require at least 1 strong topic (>8%) OR multiple topics (>5% each)
        strong_topics = [t for t in topics.values() if t.get('percentage', 0) >= 8]
        medium_topics = [t for t in topics.values() if t.get('percentage', 0) >= 5]
        
        if not strong_topics and len(medium_topics) < 2:
            return False, "This content doesn't adequately cover science curriculum topics. Please upload a focused science lesson."
        
        # STRICT: Look for educational content markers
        edu_markers = [
            'objective', 'learning outcomes', 'learning competency', 'lesson plan', 'grade level',
            'instruction', 'activity', 'discussion', 'assessment', 'learning materials', 'resources',
            'competency', 'standards', 'expectations', 'procedure', 'methodology', 'teaching',
            'students will', 'learners will', 'pupils will', 'classroom', 'practice', 'exercise',
            'worksheet', 'rubric', 'checklist', 'evaluation', 'quiz', 'test'
        ]
        edu_marker_count = sum(1 for marker in edu_markers if marker in text_lower)
        
        # If very few educational markers and document is generic, reject it
        if edu_marker_count < 2 and word_count < 200:
            return False, "This doesn't appear to be a properly structured lesson plan. Include learning objectives, activities, and assessments."
        
        # STRICT: Reject if it's mostly just a list of unrelated words/topics
        lines = lesson_text.split('\n')
        if len(lines) > 30:  # Many short lines suggest it might be a list
            short_lines = [l for l in lines if len(l.strip()) < 10 and l.strip()]
            if len(short_lines) / len(lines) > 0.5:  # More than 50% short lines
                return False, "Document appears to be a list rather than a coherent lesson plan."
        
        # All validations passed
        return True, ""
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get dataset statistics"""
        quarter_counts = {}
        topic_counts = {}
        grade_counts = {'7': len(self.grade7_questions), '8': len(self.grade8_questions)}
        
        for i, q in enumerate(self.all_questions):
            quarter = q.get('quarter', 'Unknown')
            topic = q.get('topic', 'General')
            
            quarter_counts[quarter] = quarter_counts.get(quarter, 0) + 1
            
            if quarter not in topic_counts:
                topic_counts[quarter] = {}
            topic_counts[quarter][topic] = topic_counts[quarter].get(topic, 0) + 1
        
        return {
            'total_questions': len(self.all_questions),
            'by_quarter': quarter_counts,
            'by_grade': grade_counts,
            'topics_by_quarter': topic_counts
        }