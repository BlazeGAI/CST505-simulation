/**
 * Week 5: Virtualization and Isolation — the manual-calculation reference.
 * Popek & Goldberg (1974) define an instruction as:
 *
 * - **privileged**: it traps (faults to the kernel) when executed outside
 *   the most-privileged mode.
 * - **sensitive**: it is *control-sensitive* (its execution can change the
 *   amount or allocation of shared resources, e.g. memory or the CPU) or
 *   *behavior-sensitive* (its result depends on the current privilege mode
 *   or resource configuration).
 *
 * Their theorem: a recursively virtualizable (trap-and-emulate) VMM can be
 * built for an architecture if and only if every sensitive instruction is
 * also privileged. If even one instruction is sensitive but *not*
 * privileged, it executes silently in user mode instead of trapping to the
 * VMM — the VMM never gets a chance to emulate it, so a guest can observe or
 * corrupt real machine state. This is deliberately fixed (not seeded) —
 * every student classifies the same instruction list by hand first. It is
 * loosely modeled on 1970s-80s x86's real POPF/PUSHF flags problem, which is
 * exactly why x86 needed hardware virtualization extensions (VT-x/AMD-V)
 * before trap-and-emulate hypervisors were practical on it.
 */
export interface InstructionClassification {
  mnemonic: string;
  description: string;
  privileged: boolean;
  sensitive: boolean;
}

export const POPEK_GOLDBERG_INSTRUCTIONS: InstructionClassification[] = [
  {
    mnemonic: "ADD",
    description: "Adds two general-purpose registers.",
    privileged: false,
    sensitive: false,
  },
  {
    mnemonic: "LOAD",
    description: "Reads a word from an address within the process's own mapped memory.",
    privileged: false,
    sensitive: false,
  },
  {
    mnemonic: "NOP",
    description: "Does nothing for one cycle.",
    privileged: false,
    sensitive: false,
  },
  {
    mnemonic: "CPUID",
    description: "Reads static, read-only identification data about the CPU model.",
    privileged: false,
    sensitive: false,
  },
  {
    mnemonic: "HLT",
    description: "Halts the CPU until the next interrupt — stops all further scheduling on this core.",
    privileged: true,
    sensitive: true,
  },
  {
    mnemonic: "SET_TIMER",
    description: "Programs the interval timer that drives preemptive scheduling.",
    privileged: true,
    sensitive: true,
  },
  {
    mnemonic: "IN / OUT",
    description: "Reads or writes a byte on a hardware I/O port.",
    privileged: true,
    sensitive: true,
  },
  {
    mnemonic: "LGDT",
    description: "Loads the descriptor-table register that defines every segment's privilege level.",
    privileged: true,
    sensitive: true,
  },
  {
    mnemonic: "POPF",
    description:
      "Pops the flags register off the stack, including the interrupt-enable bit — but only kernel mode may " +
      "actually change that bit; in user mode the bit is silently left unchanged with no trap, so the " +
      "instruction always completes and its outcome still depends on the current privilege mode.",
    privileged: false,
    sensitive: true,
  },
  {
    mnemonic: "MOV_TO_SEGMENT",
    description: "Loads a segment register from a descriptor-table entry, honoring that entry's privilege level.",
    privileged: true,
    sensitive: true,
  },
];

export interface VirtualizabilityAnalysis {
  instructions: InstructionClassification[];
  sensitiveCount: number;
  privilegedCount: number;
  violators: InstructionClassification[];
  isStrictlyVirtualizable: boolean;
}

/**
 * Applies the Popek-Goldberg theorem to a fixed instruction list: an
 * architecture is strictly (trap-and-emulate) virtualizable exactly when
 * every sensitive instruction is also privileged, i.e. there are no
 * sensitive-but-unprivileged "violators".
 */
export function analyzeVirtualizability(
  instructions: InstructionClassification[] = POPEK_GOLDBERG_INSTRUCTIONS,
): VirtualizabilityAnalysis {
  const violators = instructions.filter((i) => i.sensitive && !i.privileged);
  return {
    instructions,
    sensitiveCount: instructions.filter((i) => i.sensitive).length,
    privilegedCount: instructions.filter((i) => i.privileged).length,
    violators,
    isStrictlyVirtualizable: violators.length === 0,
  };
}
