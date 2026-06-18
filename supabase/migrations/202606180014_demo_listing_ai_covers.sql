-- Attach project-local AI generated regional cover images to the demo listings.

update public.listings
set cover_image_path = case slug
  when 'georgia-flint-river-whitetail-turkey-lease'
    then '/images/listings/georgia-flint-river-whitetail-turkey-lease.jpg'
  when 'texas-panhandle-mule-deer-quail-lease'
    then '/images/listings/texas-panhandle-mule-deer-quail-lease.jpg'
  when 'montana-bitterroot-elk-black-bear-access'
    then '/images/listings/montana-bitterroot-elk-black-bear-access.jpg'
  else cover_image_path
end
where slug in (
  'georgia-flint-river-whitetail-turkey-lease',
  'texas-panhandle-mule-deer-quail-lease',
  'montana-bitterroot-elk-black-bear-access'
);
