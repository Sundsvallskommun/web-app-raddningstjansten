import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Link,
  Divider,
} from '@mui/material';

const SOURCE_URL =
  'https://rtjmedelpad.se/privatperson/brandsakerhet-i-hemmet/sotning-och-brandskyddskontroll/sa-ofta-behover-du-sota';

interface Group {
  title: string;
  items: { primary: string; secondary: string }[];
}

// Sotningsfrister enligt Medelpads Räddningstjänstförbund.
const GROUPS: Group[] = [
  {
    title: 'Lokaleldstäder (öppna spisar, kaminer, kakelugnar)',
    items: [
      { primary: 'Mer än 500 kg (ca 1 m³) ved per år', secondary: 'Vart 1:a år' },
      { primary: 'Mindre än 500 kg (ca 1 m³) ved per år', secondary: 'Vart 3:e år' },
    ],
  },
  {
    title: 'Värme-, varmvatten-, varmlufts- och ångpannor',
    items: [
      { primary: 'Fastbränsle, konventionell panna', secondary: '5 ggr/år' },
      { primary: 'Fastbränsle, keramikinklädd eller pelletspanna', secondary: '2 ggr/år' },
      { primary: 'Begränsad eldning med fastbränsle (< 10 ggr/år)', secondary: 'Vart 1:a år' },
      { primary: 'Mycket begränsad eldning (≤ 1 gång/år)', secondary: 'Vart 3:e år' },
      { primary: 'Tung eldningsolja', secondary: '4 ggr/år' },
      { primary: 'Lätt eldningsolja (> 60 kW)', secondary: '1 gång/år' },
      { primary: 'Lätt eldningsolja (≤ 60 kW)', secondary: 'Vartannat år' },
    ],
  },
  {
    title: 'Imkanaler (köksventilation)',
    items: [
      { primary: 'Pizzaugnar och kolgrillar', secondary: '3–5 ggr/år' },
      { primary: 'Restaurang/storkök (spis, fritös)', secondary: '3 ggr/år' },
      { primary: 'Kök med liten beläggning', secondary: 'Vart 1:a år' },
    ],
  },
];

/** Explains what a sotningsobjekt is, with the sweeping intervals per object type. */
export function ObjektInfoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>Vad är ett objekt?</DialogTitle>
      <DialogContent dividers>
        <Typography gutterBottom>
          Ett objekt är en eldstad, panna eller imkanal som behöver sotas (rengöras). Hur ofta ett
          objekt behöver sotas beror på typ och hur mycket du eldar. Nedan är de vanligaste
          objekttyperna och deras sotningsfrister enligt Medelpads Räddningstjänstförbund.
        </Typography>

        {GROUPS.map((g, gi) => (
          <div key={g.title}>
            {gi > 0 && <Divider sx={{ my: 1 }} />}
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              {g.title}
            </Typography>
            <List dense disablePadding>
              {g.items.map(it => (
                <ListItem key={it.primary} disableGutters>
                  <ListItemText primary={it.primary} secondary={it.secondary} />
                </ListItem>
              ))}
            </List>
          </div>
        ))}

        <Typography variant="body2" sx={{ mt: 2 }}>
          Källa:{' '}
          <Link href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            rtjmedelpad.se – Så ofta behöver du sota
          </Link>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Stäng</Button>
      </DialogActions>
    </Dialog>
  );
}
