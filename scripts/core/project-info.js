/* ============================================================================
   scripts/core/project-info.js  —  About the project and the team
   ----------------------------------------------------------------------------
   WHAT THIS FILE DOES
     Holds the text shown in Settings → About: the mission, what the platform
     does, the team, the vision, credits and licences.

   SAFE TO EDIT
     Yes. Change the text between the quote marks (`like this`), save, and
     refresh the page. Keep the commas and brackets as they are.
     Team photos live in assets/team/ (square JPG, about 360 × 360 px). To
     change one, replace the file with the same name; delete the photo line
     to show initials instead.
   ============================================================================ */

OGS.PROJECT = {
  name: 'optics.quriosity',
  brand: 'Quriosity',
  slogan: 'Quriosity begins here',

  // The headline and the two paragraphs at the top of the About page.
  tagline: 'Programmable photonics, open to everyone',
  mission: [
    `optics.quriosity turns a browser into a quantum-optics laboratory. Lay out beam splitters, mirrors and phase shifters on a programmable grid, send in single photons, and follow the exact quantum state as it evolves, with no optical table, no special hardware and nothing to install.`,
    `We are physicists and software developers who want every researcher, teacher and student to be able to test an idea in quantum optics the moment they have it, and to understand what they see.`,
  ],

  // Three short cards under the mission: what the platform lets you do.
  pillars: [
    { icon: 'grid', title: 'Design', text: 'Build interferometers on a grid where every node is a tunable beam splitter, as on a programmable photonic chip.' },
    { icon: 'atom', title: 'Simulate', text: 'Get exact multi-photon amplitudes at every time step, checked against the original symbolic code.' },
    { icon: 'sparkles', title: 'Explore', text: 'Go from single-photon interference to extended Wigner’s-friend scenarios in a few clicks, in class or in research.' },
  ],

  team: [
    {
      name: 'Dr. Bindiya Arora',
      photo: 'assets/team/bindiya-arora.jpg',
      github: 'bindiyaarora',
      role: 'Group Leader & Project Supervisor',
      bio: `Associate Professor of Physics at Guru Nanak Dev University, Amritsar, and Coordinator of its Centre for Quantum and Materials Science. After a PhD at the University of Delaware, she was a PSI Fellow at the Perimeter Institute for Theoretical Physics and Adjunct Faculty at the University of Waterloo. Her work covers theoretical atomic physics, quantum computation and computational methods for quantum technologies. She sets the project’s scientific direction and makes sure the platform can take on real questions in quantum foundations and technology.`,
    },
    {
      name: 'Vipul Badhan',
      photo: 'assets/team/vipul-badhan.jpg',
      github: 'VipulBadhan',
      role: 'Project Lead & Lead Physicist',
      bio: `PhD researcher in physics at Guru Nanak Dev University, working on computational atomic physics and quantum foundations. The platform began as his idea. He builds its physics framework, decides what a programmable photonic circuit has to be able to do, and leads the implementation of quantum-optics experiments and protocols.`,
    },
    {
      name: 'Gurnoor Singh',
      photo: 'assets/team/gurnoor-singh.jpg',
      github: 'gurnoorsingh13',
      role: 'Software & Interface Development',
      bio: `Designs and builds the software and everything you see on screen. He turns the team’s scientific requirements into a clear, practical tool, so that researchers, educators and students can work with programmable photonic circuits without fighting the software.`,
    },
  ],

  // The closing statement.
  vision: [
    `We want exploring a photonic circuit to be as easy as sketching one, whether you are meeting interference for the first time or testing a scenario at the edge of quantum foundations.`,
    `optics.quriosity is open by design and will grow with the people who use it. Feedback from researchers, educators and industry decides what we build next.`,
  ],

  affiliation: 'Department of Physics, Guru Nanak Dev University, Amritsar, India',
  group: 'A project of the Quriosity group',
  contact: ['contact@quriositygroup.in', 'quriositygroup@gmail.com'],
  repo: 'https://github.com/gurnoorsingh13/optics.quriosity',

  credits: [
    { what: 'Quriosity name and logo', who: 'The optics.quriosity team', licence: 'All rights reserved', url: 'assets/brand/LICENSE.md' },
    { what: 'Component drawings', who: 'ComponentLibrary by Alexander Franzen', licence: 'CC BY-NC 3.0', url: 'https://creativecommons.org/licenses/by-nc/3.0/' },
    { what: 'Interface icons', who: 'In the style of Lucide (lucide.dev)', licence: 'ISC', url: 'https://lucide.dev/license' },
    { what: 'Fonts', who: 'Inter and JetBrains Mono', licence: 'SIL Open Font License 1.1', url: 'https://openfontlicense.org' },
  ],

  licence: 'Source code: MIT License (see LICENSE). Component drawings: CC BY-NC 3.0 (see assets/components/LICENSE.md). The Quriosity name and logo are not covered by the MIT License (see assets/brand/LICENSE.md).',
};
