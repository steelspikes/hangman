import React, { useState } from "react";
import "./ChoiceChips.css";

export default function ChoiceChips({
    values=[],
    className="",
    onChange,
    id=null,
    value=null,
    disabled
}) {
    return <div className={"choice-chips " + className}>
        {
            values.map(_value => <button 
                    disabled={disabled}
                    onClick={_ => {
                        onChange(_value, id);
                    }}
                    className={'choice-chip ' + (value === _value ? 'active-chip ' : '' + (!disabled ? 'choice-chip-hover' : ''))}
                >
                    {_value}
                </button>
            )
        }
    </div>
}