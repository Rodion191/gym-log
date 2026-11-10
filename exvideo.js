// Видео по упражнениям. Проверено 09.11.2026 запросом oEmbed YouTube: видео существует,
// канал и название получены. Техника в видео НЕ оценивалась.
// ru — видео на русском: квалификация авторов проверена НЕ была (открытых данных найти не удалось).
// en — видео на английском от организаций и признанных тренеров (показываются свёрнуто, по желанию).
// k у en: org — организация/издательство, coach — тренер/эксперт, media — коммерческое издание.
const EXVID = {
  "Barbell_Bench_Press_-_Medium_Grip": {
    ru: [{y:"nWo_m0REGMA", c:"Михаил Смалько", t:"Жим штанги лёжа. Правильная техника"}, {y:"XUeE5cTzsfo", c:"ТВОЙ ТРЕНЕР: энциклопедия фитнеса", t:"Жим штанги лёжа классический: техника и нюансы"}],
    en: [{y:"JY2PW3LhHtQ", c:"Barbell Logic", t:"How to Bench Press Properly", k:"coach"}, {y:"4Y2ZdHCOXok", c:"Jeremy Ethier", t:"How to PROPERLY Bench Press for Growth", k:"coach"}]
  },
  "Close-Grip_Barbell_Bench_Press": {
    ru: [{y:"Er_XTfK3Auc", c:"Михаил Смалько", t:"Жим штанги узким хватом. Правильная техника выполнения"}]
  },
  "Dumbbell_Bench_Press": { en: [{y:"AuNRCrdhquE", c:"NASM", t:"How to do a Two-Arm Dumbbell Chest Press", k:"org"}] },
  "Incline_Dumbbell_Press": {
    ru: [{y:"ZixeFw_iHVY", c:"Михаил Смалько", t:"Жим гантелей лёжа на наклонной скамье"}],
    en: [{y:"JKnpHchOWPU", c:"NASM", t:"How to do a Two-Arm Incline Dumbbell Chest Press", k:"org"}]
  },
  "Pushups": { en: [{y:"WDIpL0pjun0", c:"NASM", t:"How to do a Push-Up", k:"org"}] },
  "Dips_-_Chest_Version": {
    ru: [{y:"Wy090f3v4AY", c:"STROITEL тренажерный зал", t:"Правильное выполнение — отжимание на брусьях для груди"}],
    en: [{y:"yN6Q1UI_xkE", c:"Jeff Nippard", t:"How To Do Dips For A Bigger Chest and Shoulders", k:"coach"}]
  },
  "Dips_-_Triceps_Version": {
    ru: [{y:"WUwgqYMfP6s", c:"Евгений Есипович", t:"Отжимания на брусьях — техника выполнения упражнения"}],
    en: [{y:"Toa3QLz5I54", c:"Nottingham Physio", t:"How to Perform Tricep Dips", k:"coach"}]
  },
  "Parallel_Bar_Dip": { ru: [{y:"WUwgqYMfP6s", c:"Евгений Есипович", t:"Отжимания на брусьях — техника выполнения упражнения"}] },
  "Bench_Dips": { en: [{y:"WVeZDBhZwLA", c:"NASM", t:"How to do a Bench Dip", k:"org"}] },
  "Standing_Military_Press": {
    ru: [{y:"rLTulc8Gbe8", c:"Михаил Смалько", t:"Жим штанги стоя / армейский жим. Правильная техника"}, {y:"xKgZgKqv5AI", c:"Кузница Спорта", t:"Армейский жим. Жим штанги стоя и жим штанги сидя"}],
    en: [{y:"cGnhixvC8uA", c:"NASM", t:"How to do a Barbell Overhead Press", k:"org"}, {y:"nNMR9fRGRjQ", c:"Barbell Logic", t:"How to Press: Proper Overhead Press Form", k:"coach"}]
  },
  "Side_Lateral_Raise": {
    ru: [{y:"jlz9upE5_hE", c:"Евгений Есипович", t:"Махи гантелей в стороны стоя — как правильно делать упражнение"}],
    en: [{y:"XPPfnSEATJA", c:"NASM", t:"How to do a Dumbbell Lateral Raise", k:"org"}]
  },
  "Face_Pull": { en: [{y:"eTCBSFlCJ_s", c:"NASM", t:"How to do a Face Pull", k:"org"}] },
  "Pullups": {
    ru: [{y:"0b4hpICB5iE", c:"Михаил Смалько", t:"Подтягивания. Правильная техника"}, {y:"HTkackSMtrE", c:"Ефим Баранов", t:"Подтягивания в гравитроне широким хватом — техника выполнения"}],
    en: [{y:"9yVGh3XbJ34", c:"NASM", t:"How to do a Pull-Up", k:"org"}]
  },
  "Wide-Grip_Lat_Pulldown": {
    ru: [{y:"TXg-sfZYUm8", c:"Евгений Есипович", t:"Тяга верхнего блока к груди — как делать правильно"}, {y:"_bPdnFwrLhw", c:"Спортивный Бро", t:"Тяга верхнего блока (широкий хват)"}],
    en: [{y:"SALxEARiMkw", c:"ATHLEAN-X", t:"How to do Lat Pulldowns (AVOID MISTAKES!)", k:"coach"}]
  },
  "Seated_Cable_Rows": {
    ru: [{y:"9job4APnoac", c:"Михаил Смалько", t:"Тяга нижнего блока. Правильная техника"}, {y:"KbINn6CNBfw", c:"Евгений Есипович", t:"Тяга нижнего блока: правильная техника упражнения"}],
    en: [{y:"0R9ZQd3aM6s", c:"NASM", t:"How to do a Seated Row", k:"org"}]
  },
  "Bent_Over_Barbell_Row": {
    ru: [{y:"Fv4-fiwGGVA", c:"ТВОЙ ТРЕНЕР: энциклопедия фитнеса", t:"Тяга штанги в наклоне: 2 варианта выполнения"}, {y:"akTZYqZ2GX8", c:"Евгений Есипович", t:"Тяга штанги в наклоне — ошибки начинающих, техника выполнения"}],
    en: [{y:"ZtTwgJTBjOQ", c:"Human Kinetics", t:"How to perform the barbell bent over row", k:"org"}]
  },
  "Reverse_Grip_Bent-Over_Rows": { en: [{y:"ZuC7ma4ktm0", c:"NASM", t:"How to do a Bent-Over Barbell Row Supinated", k:"org"}] },
  "One-Arm_Dumbbell_Row": {
    ru: [{y:"kaIJZbsykRU", c:"Михаил Смалько", t:"Тяга гантели к поясу в наклоне. Правильная техника выполнения"}, {y:"u7_af7jFb4g", c:"ТВОЙ ТРЕНЕР: энциклопедия фитнеса", t:"Тяга гантелей в наклоне: техника и нюансы"}]
  },
  "Upright_Barbell_Row": { ru: [{y:"mM38ILtpXN0", c:"Кузница Спорта", t:"Тяга штанги к подбородку — техника"}] },
  "Barbell_Deadlift": {
    ru: [{y:"WXI2_w0C-y4", c:"Евгений Есипович", t:"Классическая становая тяга"}, {y:"ofe8YeSF4F0", c:"Тимур Полещук", t:"Техника становой тяги: как тянуть в классике"}],
    en: [{y:"yPqv3ejnZvc", c:"NASM", t:"How to do a Barbell Deadlift", k:"org"}]
  },
  "Romanian_Deadlift": {
    ru: [{y:"bnuDUDfaUOM", c:"Михаил Смалько", t:"Румынская тяга со штангой. Правильная техника"}, {y:"SMYA4GtgDKE", c:"Алексей Динулов", t:"Румынская тяга — техника, ключевые моменты и разбор ошибок"}],
    en: [{y:"xgusDooVfKU", c:"NASM", t:"How to do a Romanian Deadlift (Barbell)", k:"org"}, {y:"_oyxCn2iSjU", c:"Jeff Nippard", t:"How To Do Romanian Deadlifts (RDLs)", k:"coach"}]
  },
  "Barbell_Curl": {
    ru: [{y:"MTEtGEHwUNQ", c:"Михаил Смалько", t:"Подъём штанги на бицепс стоя. Правильная техника"}, {y:"4Emp3gXXWL0", c:"Фитнес-клубы «Тимур GYM»", t:"Бицепс со штангой стоя (техника)"}],
    en: [{y:"dDI8ClxRS04", c:"Bodybuilding.com", t:"Barbell Curl - Biceps Exercise", k:"media"}]
  },
  "Hammer_Curls": {
    ru: [{y:"Pd4WUV-boGA", c:"ТВОЙ ТРЕНЕР: энциклопедия фитнеса", t:"Сгибание рук с гантелями «молот»: техника и нюансы"}, {y:"phjP_sVqbGE", c:"Фитнес-клубы «Тимур GYM»", t:"Бицепс. Подъём гантелей стоя (молоток)"}],
    en: [{y:"CFBZ4jN1CMI", c:"NASM", t:"How to do a Dumbbell Hammer Curl", k:"org"}]
  },
  "Alternate_Hammer_Curl": {
    ru: [{y:"OG_mbe_M4ag", c:"Фитнес-клубы «Тимур GYM»", t:"Бицепс. Упражнение «молоток»"}],
    en: [{y:"nL3SedGG7X0", c:"NASM", t:"How to do a Dumbbell Hammer Curl", k:"org"}]
  },
  "EZ-Bar_Skullcrusher": {
    ru: [{y:"v1K0H8A_AME", c:"ТВОЙ ТРЕНЕР: энциклопедия фитнеса", t:"Французский жим со штангой лёжа: техника и нюансы"}, {y:"b4VPv1NkEq4", c:"Евгений Есипович", t:"Французский жим лёжа со штангой — техника упражнения"}],
    en: [{y:"4re6CJ0XNF8", c:"Bodybuilding.com (Jim Stoppani, Ph.D.)", t:"How To Do The Lying Triceps Extension Exercise", k:"media"}]
  },
  "Lying_Triceps_Press": {
    ru: [{y:"UhjZOt3w7Uo", c:"Евгений Есипович", t:"Французский жим лёжа: техника выполнения и советы"}],
    en: [{y:"4re6CJ0XNF8", c:"Bodybuilding.com (Jim Stoppani, Ph.D.)", t:"How To Do The Lying Triceps Extension Exercise", k:"media"}]
  },
  "Triceps_Pushdown": { en: [{y:"WUu0oK5j7Hk", c:"Mile High Muscle (тренер, сертификат NASM)", t:"How to do a Tricep Pushdown with Proper Form", k:"coach"}] },
  "Leg_Press": {
    ru: [{y:"OuYntuCH-8E", c:"Евгений Есипович", t:"Жим ногами в тренажёре: техника выполнения"}, {y:"aGXleX5AOsA", c:"Фитнес и Бизнес", t:"Жим ногами: правильная техника, регулировка тренажёра"}],
    en: [{y:"cDGOn-yfKJA", c:"NASM", t:"How to do a Leg Press", k:"org"}, {y:"-Nw8EWUrJuQ", c:"Muscle & Strength", t:"Leg Press 101: How to, Tips, & Tricks", k:"media"}]
  },
  "Barbell_Squat": {
    ru: [{y:"G15a4siwL1w", c:"Михаил Смалько", t:"Приседания со штангой. Правильная техника"}, {y:"kFA7pk9ZZqg", c:"AQUASTAR FITNESS (фитнес-клуб)", t:"Техника выполнения приседа со штангой"}],
    en: [{y:"-bJIpOq-LWk", c:"NASM", t:"How to do a Barbell Back Squat", k:"org"}, {y:"Fsn8U97Zskg", c:"Human Kinetics", t:"How to perform a barbell back squat", k:"org"}]
  },
  "Lying_Leg_Curls": {
    ru: [{y:"BXXaYSW2Ozw", c:"Михаил Смалько", t:"Сгибание ног лёжа в тренажёре. Правильная техника"}, {y:"TCLEM7xjdb0", c:"Анастасия Новикова про женский фитнес", t:"Техника упражнений: сгибание ног лёжа"}],
    en: [{y:"lUH80pneL5w", c:"NASM", t:"How to do a Lying Leg Curl", k:"org"}]
  },
  "Leg_Extensions": {
    ru: [{y:"90q3AHfoAaw", c:"Кузница Спорта", t:"Разгибание ног в тренажёре — техника"}, {y:"JzMZZKtP3OI", c:"Олександр Попенко", t:"Разгибания ног сидя: техника выполнения"}],
    en: [{y:"ljO4jkwv8wQ", c:"Jeff Nippard", t:"How To Do Leg Extensions With Perfect Technique", k:"coach"}]
  }
};
