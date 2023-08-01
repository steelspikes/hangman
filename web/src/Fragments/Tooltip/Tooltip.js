import { useEffect, useState } from 'react';
import './Tooltip.css';

export default function TooltipArea({children, text, onClick, textOnClick, touchableClasses, wrapperClasses}) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [_text, _setText] = useState('');

    useEffect(() => {
        _setText(text);
    }, [text]);

    const onMouseOver = e => {
        if(!showTooltip) {
            setShowTooltip(true);
        }
    }

    const onMouseLeave = e => {
        setTimeout(() => {
            setShowTooltip(false);
            setTimeout(() => {
                _setText(text);
            }, 500);
        }, 100);
    }

    const _onClick = () => {
        if(onClick) {
            onClick();
        }

        if(textOnClick) {
            _setText(textOnClick);
        }
    }

    return <div className={wrapperClasses}>
        <div className='tooltip-inner-wrapper'>
            <div className={touchableClasses + " pointer"} onClick={_onClick} onMouseOver={onMouseOver} onMouseLeave={onMouseLeave}>
                { children }
            </div>
            <div className='tooltip-container-wrapper'>
                <div className='tooltip-container' style={{opacity: showTooltip ? 1 : 0}}>
                    {_text}
                </div>
            </div>
        </div>
    </div>
}