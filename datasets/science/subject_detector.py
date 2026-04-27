"""
Subject detection utility for quiz generation
Detects whether a lesson plan is about Science or English
based on MATATAG Curriculum standards
"""

def detect_subject_from_lesson(lesson_text: str) -> str:
    """
    Detect whether a lesson is about Science or English
    Returns: 'Science', 'English', or 'Unknown'
    Uses MATATAG curriculum keywords for accurate detection
    """
    lesson_lower = lesson_text.lower()
    
    # Comprehensive Science keywords (Grades 7-10 MATATAG)
    science_keywords = {
        'science', 'physics', 'chemistry', 'biology', 'earth science',
        'particle model', 'atom', 'molecule', 'cell', 'mitochondria', 'chloroplast',
        'photosynthesis', 'respiration', 'organism', 'ecosystem', 'food chain',
        'evolution', 'natural selection', 'biodiversity', 'dna', 'genetics',
        'force', 'motion', 'energy', 'kinetic', 'potential', 'work',
        'electricity', 'circuit', 'current', 'magnetic', 'electromagnetic',
        'wave', 'light', 'refraction', 'reflection', 'sound',
        'matter', 'state', 'mass', 'volume', 'density',
        'reaction', 'chemical', 'acid', 'base', 'salt',
        'earthquake', 'volcano', 'plate tectonics', 'lithosphere', 'mantle',
        'weather', 'climate', 'typhoon', 'monsoon', 'pressure', 'temperature',
        'scientific method', 'hypothesis', 'experiment', 'variable', 'observation', 'data',
        'microscope', 'telescope', 'periodic table', 'valence', 'ionic', 'covalent',
        'homeostasis', 'adaptation', 'organ system', 'heredity', 'inheritance',
        'grade 7 science', 'grade 8 science', 'grade 9 science', 'grade 10 science',
        'scin7', 'scin8', 'scin9', 'scin10'
    }
    
    # Comprehensive English keywords (Grades 7-10 MATATAG)
    english_keywords = {
        'english', 'literature', 'literary', 'dll',  # DLL = Daily Lesson Log (MATATAG)
        # Text types and genres
        'poetry', 'poem', 'verse', 'prose', 'drama', 'narrative', 'fiction', 'novel',
        'short story', 'essay', 'expository', 'persuasive', 'argumentative',
        'informational text', 'transactional', 'letter', 'correspondence',
        'afro-asian', 'anglo-american', 'world literature', 'philippine literature',
        # Literary elements - MATATAG focus
        'character', 'characterization', 'protagonist', 'antagonist', 'foil',
        'conflict', 'character vs', 'plot', 'climax', 'exposition', 'resolution',
        'setting', 'theme', 'symbolism', 'allegory',
        'point of view', 'narrator', 'narration', 'dialogue',
        'characterization', 'direct characterization', 'indirect characterization',
        'dynamic character', 'static character', 'round character', 'flat character',
        # Poetic devices
        'stanza', 'rhyme', 'meter', 'rhythm', 'alliteration', 'assonance', 'consonance',
        'onomatopoeia', 'metaphor', 'simile', 'personification', 'hyperbole',
        'irony', 'pun', 'understatement', 'oxymoron', 'figurative language', 'imagery',
        # Writing/analysis concepts
        'tone', 'mood', 'diction', 'style', 'voice', 'register',
        'coherence', 'cohesion', 'thesis', 'evidence', 'argument', 'persuasive techniques',
        'foreshadowing', 'flashback', 'parallel plot',
        'organic unity', 'binary opposition', 'co-text', 'collocation',
        # MATATAG specific terms
        'learning competencies', 'learning competency', 'content standards', 
        'performance standards', 'text foci', 'structural context',
        'florante at laura', 'shakespeare', 'romeo and juliet', 'hamlet',
        'grade 7 english', 'grade 8 english', 'grade 9 english', 'grade 10 english',
        'en7', 'en8', 'en9', 'en10',  # English course codes
        'en7lit', 'en8lit', 'en9lit', 'en10lit',
        'en7inf', 'en8inf', 'en9inf', 'en10inf',
        'publishing', 'compose', 'revise', 'edit'
    }
    
    # Count keyword occurrences with weighted scoring
    science_score = 0
    english_score = 0
    
    for kw in science_keywords:
        count = lesson_lower.count(kw)
        if count > 0:
            # Weight multi-word keywords higher
            weight = 2 if ' ' in kw else 1
            science_score += count * weight
    
    for kw in english_keywords:
        count = lesson_lower.count(kw)
        if count > 0:
            # Weight multi-word keywords higher
            weight = 2 if ' ' in kw else 1
            english_score += count * weight
    
    # Determine subject based on scores
    # Check file name for strong indicators
    if 'english' in lesson_lower:
        english_score += 10  # Boost if document mentions English
    if 'literature' in lesson_lower:
        english_score += 5
    if 'science' in lesson_lower and 'english' not in lesson_lower:
        science_score += 10
    
    # Require at least one keyword match to be confident
    if english_score > science_score and english_score > 0:
        return 'English'
    elif science_score > english_score and science_score > 0:
        return 'Science'
    elif english_score > 0:
        return 'English'
    elif science_score > 0:
        return 'Science'
    else:
        return 'Unknown'
