-- One-time cleanup: remove WordPress CMS wording and robotic always_do defaults.

update public.agent_personas
set
  specialty = 'Custom static business sites and landing pages',
  updated_at = now()
where specialty ~* '\m(wordpress|wix|shopify|webflow|squarespace|framer)\M';

update public.agent_personas
set
  title = 'Web Designer',
  updated_at = now()
where lower(trim(title)) = 'small business website developer';

update public.agent_personas
set
  always_do = 'Keep replies short and natural. Match the client''s message length.',
  updated_at = now()
where always_do ~* 'client first name|2-5 sentences|max 2 questions';
