input
  = inp:(commands / message) { return inp; }

message "Message"
  = .* { return [ { "cmd": "echo", args: [text()], "div": null } ]; }

commands "command"
  = cmd:commandText+ { return cmd; }

commandText "command"
  = [/] identifier:identifier args:arg* nbws div:cmdDivider ws { return {
      cmd: identifier,
      args: args,
      div: div
  };}

cmdDivider "command separator"
  = redir:redirection? { return redir; }

nbws "whitespace" = [ \t]*
ws "whitespace" = [ \t\n\r]*
rws "whitespace" = [ \t\n\r]+

redirection "redirection"
  = ";" { return ";" }
  / "|" { return "|" }
  / dig:number op:">&" dig2:number { return { redirect: op, augend: dig, addend: dig2 } }
  / dig:number op:">&" add:"-" { return { redirect: op, augend: dig, addend: add } }
  / dig:number op:"<&" dig2:number { return { redirect: op, addend: dig2, augend: dig } }
  / dig:number op:"<&" add:"-" { return { redirect: op, augend: dig, addend: add } }

  / dig:number op:">>" { return { redirect: op, augend: dig } }
  / dig:number op:">&" { return { redirect: op, augend: dig } }
  / dig:number op:">|" { return { redirect: op, augend: dig } }
  / dig:number op:">" { return { redirect: op, augend: dig } }

  / dig:number op:"<<-" { return { redirect: op, augend: dig } }
  / dig:number op:"<<" { return { redirect: op, augend: dig } }
  / dig:number op:"<&" { return { redirect: op, augend: dig } }
  / dig:number op:"<>" { return { redirect: op, augend: dig } }
  / dig:number op:"<" { return { redirect: op, augend: dig } }

  / op:">&" dig:number { return { redirect: op, addend: dig } }
  / op:">&" add:"-" { return { redirect: op, addend: add } }

  / op:"<&" dig:number { return { redirect: op, addend: dig } }
  / op:"<&" add:"-" { return { redirect: op, addend: add } }

  / op:">>" { return { redirect: op } }
  / op:">&" { return { redirect: op } }
  / op:">|" { return { redirect: op } }
  / op:">" { return { redirect: op } }

  / op:"<<-" { return { redirect: op } }
  / op:"<<" { return { redirect: op } }
  / op:"<&" { return { redirect: op } }
  / op:"<>" { return { redirect: op } }
  / op:"<" { return { redirect: op } }

  / op:"&>" dig:number { return { redirect: op, addend: dig } }
  / op:"&>" { return { redirect: op } }

// ----- 3. Values -----

arg "argument"
  = nbws val:(value/variable) { return val; }

value "value"
  = false
    / null
    / true
    / number
    / string
    / identifier

false = "false" { return false; }
null  = "null"  { return null;  }
true  = "true"  { return true;  }

variable "variable"
  = "-"+ varname:variablename ws val:variablesetter? { return { name: varname, value: val }; }

variablename "variable"
  = [A-Za-z][A-Za-z0-9_-]* { return text(); }

variablesetter "variable assignment"
  = "="? ws val:value { return val; }

// ----- 6. Numbers -----

number "number"
  = minus? int frac? exp? { return parseFloat(text()); }

decimal_point "decimal point"
  = "."

digit1_9 "digit"
  = [1-9]

e "e"
  = [eE]

exp "expression"
  = e (minus / plus)? DIGIT+

frac "fraction"
  = decimal_point DIGIT+

int "integer"
  = zero / (digit1_9 DIGIT*)

minus "minus"
  = "-"

plus "plus"
  = "+"

zero "zero"
  = "0"

// ----- 7. Strings -----

identifier "identifier"
  = [$~./A-Za-z][A-Za-z0-9_./~]* { return text(); }

string "string"
  = quotation_mark chars:char* quotation_mark { return chars.join(""); }

char "character"
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }

escape "escape"
  = "\\"

quotation_mark "quotation mark"
  = '"'

unescaped "unescaped character"
  = [^\0-\x1F\x22\x5C]

// ----- Core ABNF Rules -----

// See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4234).
DIGIT "digit" = [0-9]
HEXDIG "hexadecimal digit" = [0-9a-f]i
