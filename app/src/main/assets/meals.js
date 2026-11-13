/* Emealio Eatstevan — built-in supper library.
   Every recipe is scaled for a family of 5. WW points are per adult serving and are
   ESTIMATES only (lean proteins, fruit and non-starchy veg counted as zero).
   Ingredient format: "qty unit|name|aisle"  (unit "x" = a simple count)
   Aisles: P produce, M meat & seafood, D dairy & deli, B bakery, G pantry, F frozen, S staples */
window.BUILTIN_MEALS = (function () {
  var out = [];
  function m(id, name, protein, pts, mins, tags, note, fav, ing) {
    out.push({ id: id, name: name, protein: protein, pts: pts, mins: mins, tags: tags, note: note, fav: fav, ing: ing });
  }

  // ---- Family favourites to start with ----
  m('d1', 'Slow Cooker Beef Roast with Carrots & Potatoes', 'beef', 7, 20, ['slow cooker'],
    'Soft, mild flavours. Serve the gravy on the side so picky eaters can keep foods separate.', true,
    ['3 lb|Lean beef roast (eye of round or sirloin tip)|M', '2.5 lb|Baby potatoes|P', '2 lb|Carrots|P',
     '1 x|Yellow onions|P', '1 carton|Low-sodium beef broth|G', '2 tbsp|Cornstarch|S']);
  m('d2', 'BBQ Pork Chops with Corn & Rice', 'pork', 8, 30, ['30 min'],
    'Brush BBQ sauce on most chops and leave one or two plain for kids who prefer un-sauced.', true,
    ['2.5 lb|Boneless centre-cut pork chops|M', '5 x|Corn on the cob|P', '2 cup|Jasmine rice|G', '0.5 cup|BBQ sauce|G']);
  m('d3', 'Sheet-Pan Chicken Fajitas (Build-Your-Own)', 'chicken', 7, 30, ['sheet pan', '30 min'],
    'Kids build wraps with plain chicken and cheese; adults load up the peppers and salsa.', true,
    ['2.5 lb|Chicken breast, boneless skinless|M', '4 x|Bell peppers|P', '1 x|Yellow onions|P', '12 x|Small flour tortillas|B',
     '1.5 cup|Shredded cheddar, reduced-fat|D', '1 jar|Mild salsa|G', '1 cup|Plain 0% Greek yogurt|D', '2 tbsp|Fajita or taco seasoning|S']);
  m('d4', 'Spaghetti & Meat Sauce with Garlic Knots', 'turkey', 9, 30, ['30 min'],
    'Set aside a small bowl of plain buttered noodles before mixing in the sauce if needed.', true,
    ['2 lb|Extra-lean ground turkey|M', '1 box|Spaghetti|G', '2 jar|Marinara sauce, no sugar added|G', '1 box|Frozen garlic knots|F',
     '1 x|Yellow onions|P']);
  m('d5', 'Maple-Soy BBQ Salmon with Roasted Potatoes', 'fish', 5, 35, ['sheet pan'],
    'The mild maple-soy glaze hides any "fishy" taste and caramelises nicely.', true,
    ['2.5 lb|Salmon fillets|M', '2 lb|Baby potatoes|P', '2 head|Broccoli crowns|P', '3 tbsp|Low-sodium soy sauce|S', '2 tbsp|Maple syrup|S',
     '1 head|Garlic|P']);
  m('d6', 'Crispy Baked Chicken Tenders & Oven Wedges', 'chicken', 6, 40, ['kid classic'],
    'The ultimate fussy-eater win. Baked with panko so it feels like takeout.', true,
    ['2.5 lb|Chicken breast, boneless skinless|M', '2 cup|Panko breadcrumbs|G', '3 lb|Russet potatoes|P', '1 x|Cucumber|P',
     '1 lb|Carrots|P', '2 x|Eggs|D', '1 tbsp|Olive oil|S']);
  m('d7', 'Taco Bar Night (Hard & Soft Shells)', 'beef', 7, 25, ['30 min', 'build-your-own'],
    'Set out bowls of cheese, lettuce and mild meat so kids control their own plates.', false,
    ['2 lb|Extra-lean ground beef|M', '1 box|Taco kit (hard & soft shells)|G', '1 head|Romaine lettuce|P', '4 x|Tomatoes|P',
     '1.5 cup|Shredded cheddar, reduced-fat|D', '1 jar|Mild salsa|G']);
  m('d8', 'Sheet-Pan Honey Garlic Meatballs & Veggies', 'turkey', 8, 35, ['sheet pan'],
    'Bite-sized meatballs are easy for kids; toothpicks make them fun.', false,
    ['2.2 lb|Lean turkey meatballs|M', '1.5 lb|Green beans|P', '2 cup|Jasmine rice|G', '3 tbsp|Honey|S', '3 tbsp|Low-sodium soy sauce|S',
     '1 head|Garlic|P']);
  m('d9', 'Family Pita Pizzas', 'veggie', 10, 20, ['30 min', 'build-your-own'],
    'Everyone decorates their own flatbread pizza: zero complaints at the table.', true,
    ['6 x|Naan or pita flatbreads|B', '1 jar|Pizza sauce|G', '2 cup|Shredded mozzarella, part-skim|D', '1 pkg|Turkey pepperoni|M',
     '1 x|Bell peppers|P', '1 head|Romaine lettuce|P']);

  // ---- Suggestions: new things to try ----
  m('n1', 'Turkey Chili with Cornbread Muffins', 'turkey', 6, 45, ['one pot', 'freezes well'],
    'Keep it mild and let adults add hot sauce. Kids love dunking the cornbread.', false,
    ['2 lb|Extra-lean ground turkey|M', '2 can|Kidney beans|G', '2 can|Diced tomatoes|G', '1 x|Yellow onions|P', '2 x|Bell peppers|P',
     '1 box|Cornbread muffin mix|G', '2 tbsp|Chili powder|S', '1 x|Eggs|D', '0.5 cup|Milk|D']);
  m('n2', 'Chicken & Veggie Stir-Fry with Rice', 'chicken', 6, 25, ['30 min', 'one pan'],
    'Serve the veggies, chicken and rice in separate piles for kids who do not like food touching.', false,
    ['2.5 lb|Chicken breast, boneless skinless|M', '2 head|Broccoli crowns|P', '2 x|Bell peppers|P', '1 lb|Carrots|P', '2 cup|Jasmine rice|G',
     '4 tbsp|Low-sodium soy sauce|S', '1 tbsp|Honey|S', '1 tbsp|Cornstarch|S', '1 head|Garlic|P']);
  m('n3', 'Egg Roll in a Bowl', 'pork', 3, 20, ['30 min', 'one pan', 'low point'],
    'All the egg roll flavour without the wrapper. Top with crunchy chow mein noodles for the kids.', false,
    ['2 lb|Lean ground pork|M', '2 bag|Coleslaw mix|P', '1 bunch|Green onions|P', '3 tbsp|Low-sodium soy sauce|S', '1 head|Garlic|P',
     '1 tbsp|Sesame oil|S', '1 bag|Crunchy chow mein noodles|G']);
  m('n4', 'Greek Chicken Souvlaki Bowls', 'chicken', 6, 30, ['30 min', 'build-your-own'],
    'Put the tzatziki in a dip cup: kids will eat anything they can dunk.', false,
    ['2.5 lb|Chicken breast, boneless skinless|M', '2 x|Cucumber|P', '4 x|Tomatoes|P', '2 cup|Jasmine rice|G', '1.5 cup|Plain 0% Greek yogurt|D',
     '2 x|Lemons|P', '1 head|Garlic|P', '1 tbsp|Dried oregano|S', '1 tbsp|Olive oil|S']);
  m('n5', 'Turkey Burgers & Sweet Potato Fries', 'turkey', 8, 35, ['kid classic'],
    'Make a couple of slider-sized patties for little hands.', false,
    ['2 lb|Extra-lean ground turkey|M', '6 x|Whole wheat burger buns|B', '3 lb|Sweet potatoes|P', '1 head|Romaine lettuce|P', '2 x|Tomatoes|P',
     '1 tbsp|Olive oil|S', '5 x|Light cheese slices|D']);
  m('n6', 'Breakfast for Supper: Veggie Scramble & Pancakes', 'eggs', 8, 25, ['30 min', 'meatless'],
    'A guaranteed crowd-pleaser. Top pancakes with berries instead of extra syrup.', false,
    ['12 x|Eggs|D', '1 box|Whole wheat pancake mix|G', '2 x|Bell peppers|P', '1 bag|Baby spinach|P', '2 pint|Strawberries|P',
     '1 cup|Shredded cheddar, reduced-fat|D', '1.5 cup|Milk|D', '0.25 cup|Maple syrup|S']);
  m('n7', 'Slow Cooker Salsa Chicken Rice Bowls', 'chicken', 5, 15, ['slow cooker', 'low point'],
    'Two ingredients in the pot in the morning. Shred and serve over rice with cheese.', false,
    ['2.5 lb|Chicken breast, boneless skinless|M', '1 jar|Mild salsa|G', '2 cup|Jasmine rice|G', '1 can|Black beans|G', '2 cup|Frozen corn|F',
     '1 cup|Shredded cheddar, reduced-fat|D']);
  m('n8', 'Homemade Baked Fish Sticks with Peas', 'fish', 5, 30, ['30 min', 'kid classic', 'low point'],
    'Cut the cod into fingers and bread them like chicken tenders. Ketchup is allowed.', false,
    ['2.5 lb|Cod fillets|M', '2 cup|Panko breadcrumbs|G', '2 x|Eggs|D', '3 cup|Frozen peas|F', '2 lb|Baby potatoes|P', '2 x|Lemons|P']);
  m('n9', 'Shepherd\'s Pie', 'beef', 7, 50, ['freezes well'],
    'Hidden veggies under a mashed potato blanket. Make it ahead and reheat.', false,
    ['2 lb|Extra-lean ground beef|M', '3 lb|Russet potatoes|P', '3 cup|Frozen peas and carrots|F', '1 x|Yellow onions|P',
     '1 carton|Low-sodium beef broth|G', '0.5 cup|Milk|D', '2 tbsp|Cornstarch|S']);
  m('n10', 'Chicken Noodle Soup & Grilled Cheese Dippers', 'chicken', 8, 35, ['one pot'],
    'Cut the grilled cheese into strips for dunking.', false,
    ['1.5 lb|Chicken breast, boneless skinless|M', '2 carton|Low-sodium chicken broth|G', '1 bag|Egg noodles|G', '1 lb|Carrots|P',
     '1 bunch|Celery|P', '1 x|Yellow onions|P', '1 loaf|Whole wheat bread|B', '8 x|Light cheese slices|D']);
  m('n11', 'Shrimp Fried Rice', 'seafood', 6, 25, ['30 min', 'one pan'],
    'Swap the shrimp for diced ham or chicken if seafood is a hard sell.', false,
    ['1.5 lb|Raw shrimp, peeled|M', '2.5 cup|Jasmine rice|G', '3 cup|Frozen peas and carrots|F', '4 x|Eggs|D', '1 bunch|Green onions|P',
     '4 tbsp|Low-sodium soy sauce|S', '1 tbsp|Sesame oil|S']);
  m('n12', 'Pulled BBQ Chicken Sandwiches & Coleslaw', 'chicken', 7, 15, ['slow cooker'],
    'Serve the chicken plain on a bun for kids who do not like sauce.', false,
    ['2.5 lb|Chicken breast, boneless skinless|M', '0.75 cup|BBQ sauce|G', '6 x|Whole wheat burger buns|B', '1 bag|Coleslaw mix|P',
     '0.5 cup|Plain 0% Greek yogurt|D', '1 tbsp|Apple cider vinegar|S']);
  m('n13', 'Mini Turkey Meatloaves, Mashed Potatoes & Green Beans', 'turkey', 6, 45, ['kid classic'],
    'Bake in a muffin tin: they cook faster and everyone gets their own.', false,
    ['2 lb|Extra-lean ground turkey|M', '1 cup|Panko breadcrumbs|G', '1 x|Eggs|D', '3 lb|Russet potatoes|P', '1.5 lb|Green beans|P',
     '0.25 cup|Ketchup|S', '0.5 cup|Milk|D']);
  m('n14', 'Cheesy Chicken, Broccoli & Rice Bake', 'chicken', 7, 45, ['one pan'],
    'Chop the broccoli small and it disappears into the cheesy rice.', false,
    ['2 lb|Chicken breast, boneless skinless|M', '2 head|Broccoli crowns|P', '2 cup|Jasmine rice|G', '1.5 cup|Shredded cheddar, reduced-fat|D',
     '1 carton|Low-sodium chicken broth|G', '1 cup|Plain 0% Greek yogurt|D']);
  m('n15', 'Beef & Broccoli with Rice', 'beef', 7, 25, ['30 min', 'one pan'],
    'Better than takeout and much lighter. Slice the beef thin so it stays tender.', false,
    ['2 lb|Flank or sirloin steak|M', '3 head|Broccoli crowns|P', '2 cup|Jasmine rice|G', '4 tbsp|Low-sodium soy sauce|S', '1 tbsp|Honey|S',
     '2 tbsp|Cornstarch|S', '1 head|Garlic|P']);
  m('n16', 'Tuna Melts & Tomato Soup', 'fish', 8, 20, ['30 min', 'pantry meal'],
    'A good "nothing in the fridge" supper. Plain grilled cheese works for tuna skeptics.', false,
    ['4 can|Tuna in water|G', '6 x|English muffins|B', '6 x|Light cheese slices|D', '2 carton|Tomato soup|G', '0.5 cup|Plain 0% Greek yogurt|D',
     '1 bunch|Celery|P']);
  m('n17', 'Black Bean & Cheese Quesadillas', 'veggie', 8, 20, ['30 min', 'meatless'],
    'Mash the beans a little so they stay put. Serve with salsa and yogurt for dipping.', false,
    ['2 can|Black beans|G', '10 x|Small flour tortillas|B', '2 cup|Shredded cheddar, reduced-fat|D', '2 cup|Frozen corn|F', '1 jar|Mild salsa|G',
     '1 cup|Plain 0% Greek yogurt|D', '2 x|Bell peppers|P']);
  m('n18', 'Sweet & Sour Chicken with Pineapple', 'chicken', 7, 30, ['30 min', 'one pan'],
    'Sweet enough that kids forget there are peppers in it.', false,
    ['2.5 lb|Chicken breast, boneless skinless|M', '2 can|Pineapple chunks in juice|G', '3 x|Bell peppers|P', '2 cup|Jasmine rice|G',
     '0.25 cup|Ketchup|S', '2 tbsp|Low-sodium soy sauce|S', '2 tbsp|Apple cider vinegar|S', '1 tbsp|Cornstarch|S']);
  m('n19', 'Pork Tenderloin with Apples & Sweet Potatoes', 'pork', 5, 40, ['sheet pan', 'low point'],
    'Roasted apples make this taste like dessert for supper.', false,
    ['2.5 lb|Pork tenderloin|M', '4 x|Apples|P', '3 lb|Sweet potatoes|P', '1.5 lb|Green beans|P', '1 tbsp|Olive oil|S', '1 tbsp|Dijon mustard|S']);
  m('n20', 'One-Pot Cheeseburger Macaroni', 'beef', 9, 30, ['30 min', 'one pot'],
    'Homemade hamburger helper. Stir in finely grated carrot and nobody will notice.', false,
    ['2 lb|Extra-lean ground beef|M', '1 box|Whole wheat macaroni|G', '1.5 cup|Shredded cheddar, reduced-fat|D', '1 can|Diced tomatoes|G',
     '1 carton|Low-sodium beef broth|G', '0.5 lb|Carrots|P', '1 cup|Milk|D']);
  m('n21', 'Lemon Herb Chicken with Couscous & Peas', 'chicken', 6, 30, ['30 min'],
    'Couscous cooks in five minutes and kids call it "tiny pasta".', false,
    ['2.5 lb|Chicken breast, boneless skinless|M', '2 cup|Couscous|G', '3 cup|Frozen peas|F', '2 x|Lemons|P', '1 head|Garlic|P',
     '1 tbsp|Olive oil|S', '1 tbsp|Italian seasoning|S']);
  m('n22', 'Veggie-Loaded Mac & Cheese', 'veggie', 10, 30, ['30 min', 'meatless'],
    'Blend steamed cauliflower or squash into the cheese sauce for a stealth veggie boost.', false,
    ['1 box|Whole wheat macaroni|G', '2.5 cup|Shredded cheddar, reduced-fat|D', '1 head|Cauliflower|P', '2 head|Broccoli crowns|P',
     '2 cup|Milk|D', '2 tbsp|All-purpose flour|S']);
  m('n23', 'Teriyaki Salmon Rice Bowls', 'fish', 6, 25, ['30 min', 'build-your-own'],
    'Flake the salmon over rice and let everyone add their own toppings.', false,
    ['2.5 lb|Salmon fillets|M', '2 cup|Jasmine rice|G', '2 x|Cucumber|P', '2 cup|Frozen shelled edamame|F', '1 lb|Carrots|P',
     '4 tbsp|Low-sodium soy sauce|S', '2 tbsp|Honey|S']);
  m('n24', 'Turkey Sloppy Joes with Corn', 'turkey', 7, 25, ['30 min', 'kid classic'],
    'Messy and fun. Hand out extra napkins.', false,
    ['2 lb|Extra-lean ground turkey|M', '6 x|Whole wheat burger buns|B', '1 can|Tomato sauce|G', '1 x|Bell peppers|P', '1 x|Yellow onions|P',
     '3 cup|Frozen corn|F', '0.25 cup|Ketchup|S', '1 tbsp|Yellow mustard|S']);
  m('n25', 'Baked Chicken Parmesan with Penne', 'chicken', 9, 40, ['kid classic'],
    'Baked, not fried. Keep a plain breaded piece for anyone who avoids red sauce.', false,
    ['2.5 lb|Chicken breast, boneless skinless|M', '1.5 cup|Panko breadcrumbs|G', '1 jar|Marinara sauce, no sugar added|G',
     '1.5 cup|Shredded mozzarella, part-skim|D', '1 box|Penne|G', '2 x|Eggs|D', '1 head|Romaine lettuce|P']);
  m('n26', 'Lentil & Veggie Minestrone with Crusty Bread', 'veggie', 5, 40, ['one pot', 'meatless', 'low point', 'freezes well'],
    'Use small pasta shapes and let kids sprinkle their own parmesan.', false,
    ['1.5 cup|Dried green lentils|G', '2 can|Diced tomatoes|G', '2 carton|Low-sodium chicken broth|G', '1 lb|Carrots|P', '1 bunch|Celery|P',
     '1 x|Yellow onions|P', '1 bag|Baby spinach|P', '1 cup|Small shell pasta|G', '1 loaf|Crusty whole grain bread|B']);
  m('n27', 'Hawaiian Chicken Sheet Pan', 'chicken', 5, 35, ['sheet pan', 'low point'],
    'Pineapple, peppers and chicken all roast together. One pan to wash.', false,
    ['2.5 lb|Chicken breast, boneless skinless|M', '1 can|Pineapple chunks in juice|G', '3 x|Bell peppers|P', '1 x|Red onions|P',
     '2 cup|Jasmine rice|G', '3 tbsp|Low-sodium soy sauce|S', '1 tbsp|Honey|S']);
  m('n28', 'Loaded Baked Potato Bar', 'veggie', 7, 60, ['build-your-own', 'meatless'],
    'Bake the potatoes ahead or microwave them. Everyone tops their own.', false,
    ['6 x|Large russet potatoes|P', '2 head|Broccoli crowns|P', '1.5 cup|Shredded cheddar, reduced-fat|D', '1.5 cup|Plain 0% Greek yogurt|D',
     '1 pkg|Turkey bacon|M', '1 bunch|Green onions|P', '1 can|Black beans|G']);
  m('n29', 'Mild Butter Chicken with Naan', 'chicken', 9, 35, ['one pot'],
    'A gentle, creamy intro to curry. The naan is for scooping.', false,
    ['2.5 lb|Chicken breast, boneless skinless|M', '1 jar|Mild butter chicken sauce|G', '2 cup|Jasmine rice|G', '5 x|Naan or pita flatbreads|B',
     '3 cup|Frozen peas|F', '0.5 cup|Plain 0% Greek yogurt|D']);
  m('n30', 'Slow Cooker Pork Burrito Bowls', 'pork', 7, 20, ['slow cooker', 'build-your-own'],
    'Mild shredded pork over rice with everyone\'s favourite toppings.', false,
    ['2.5 lb|Pork tenderloin|M', '2 cup|Jasmine rice|G', '1 can|Black beans|G', '2 cup|Frozen corn|F', '1 jar|Mild salsa|G',
     '1 head|Romaine lettuce|P', '1 cup|Shredded cheddar, reduced-fat|D', '2 tbsp|Fajita or taco seasoning|S']);
  m('n31', 'Cheese Tortellini & Spinach Soup', 'veggie', 8, 20, ['30 min', 'one pot', 'meatless'],
    'Ready in 20 minutes. Fish out the spinach for anyone who objects.', false,
    ['2 pkg|Fresh cheese tortellini|D', '2 carton|Low-sodium chicken broth|G', '1 can|Diced tomatoes|G', '1 bag|Baby spinach|P',
     '1 lb|Carrots|P', '1 head|Garlic|P', '1 tbsp|Italian seasoning|S']);
  return out;
})();
